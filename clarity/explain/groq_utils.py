"""Shared Groq helpers: model fallback, token budgeting, and context shrinking."""

import json
import time
import copy
from groq import Groq, RateLimitError, APIStatusError

# Free-tier TPM limits (https://console.groq.com/docs/rate-limits):
#   llama-3.1-8b-instant  → very fast, 6 000 TPM free
#   gemma2-9b-it          → fast,      14 400 TPM free  ← highest free tier
#   llama3-8b-8192        → fast fallback
#   qwen/qwen3.6-27b      → last resort (only 8 000 TPM, slow)
MODELS = [
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "llama3-8b-8192",
    "qwen/qwen3.6-27b",
]

# Stay well under the 6 000-TPM floor so even the smallest model never 413s
MAX_INPUT_TOKENS = 4500
CHARS_PER_TOKEN = 4

CHAT_SYSTEM_RULES = """You are Clarity AI, a senior software architect. Answer using the repository context below.
Rules: use context first; supplement with general knowledge when needed; never refuse; use Markdown;
no ASCII box diagrams; use relative paths only; keep answers concise when asked for brief/VIVA style;
be conversational for greetings only."""


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def messages_token_count(messages: list) -> int:
    return sum(estimate_tokens(m.get("content", "")) for m in messages)


def compact_json(obj) -> str:
    return json.dumps(obj, separators=(",", ":"), default=str)


def _truncate_structure_children(node, max_children: int) -> None:
    if not isinstance(node, dict):
        return
    children = node.get("children")
    if isinstance(children, list) and len(children) > max_children:
        omitted = len(children) - max_children
        node["children"] = children[:max_children] + [{"name": f"...+{omitted} more", "type": "omitted"}]
    for child in (node.get("children") or []):
        _truncate_structure_children(child, max_children)


def _truncate_pipeline(pipeline: dict, max_files: int, max_symbols: int) -> dict:
    items = {k: v for k, v in pipeline.items() if isinstance(v, dict)}
    if len(items) <= max_files and max_symbols <= 0:
        return pipeline
    ranked = sorted(
        items.items(),
        key=lambda x: len(x[1].get("imports", [])) + len(x[1].get("functions", [])) + len(x[1].get("classes", [])),
        reverse=True,
    )
    out = {}
    for path, data in ranked[:max_files]:
        entry = {
            "imports": data.get("imports", [])[:max_symbols] if max_symbols else data.get("imports", []),
            "functions": data.get("functions", [])[:max_symbols] if max_symbols else data.get("functions", []),
            "classes": data.get("classes", [])[:max_symbols] if max_symbols else data.get("classes", []),
        }
        out[path] = entry
    if len(items) > max_files:
        out["_TRUNCATED_"] = f"{len(items) - max_files} more files omitted"
    return out


def shrink_context(context: dict, level: int = 0) -> dict:
    """Progressively shrink repo context. Higher level = smaller payload."""
    profiles = [
        {"pipeline_files": 8, "max_symbols": 20, "readme": 1500, "structure_children": 12},
        {"pipeline_files": 5, "max_symbols": 12, "readme": 800, "structure_children": 8},
        {"pipeline_files": 3, "max_symbols": 8, "readme": 400, "structure_children": 5},
        {"pipeline_files": 0, "max_symbols": 0, "readme": 200, "structure_children": 3},
    ]
    profile = profiles[min(level, len(profiles) - 1)]
    ctx = copy.deepcopy(context or {})

    if "pipeline" in ctx and isinstance(ctx["pipeline"], dict):
        if profile["pipeline_files"] == 0:
            ctx.pop("pipeline", None)
        else:
            ctx["pipeline"] = _truncate_pipeline(ctx["pipeline"], profile["pipeline_files"], profile["max_symbols"])

    readme = ctx.get("readme")
    if isinstance(readme, str) and len(readme) > profile["readme"]:
        ctx["readme"] = readme[: profile["readme"]] + "...(truncated)"

    structure = ctx.get("structure")
    if isinstance(structure, dict):
        _truncate_structure_children(structure.get("root", {}), profile["structure_children"])

    return ctx


def build_chat_system_message(context: dict) -> str:
    return f"{CHAT_SYSTEM_RULES}\n\nRepository Context:\n{compact_json(context)}"


def fit_messages_to_budget(messages: list, max_tokens: int = MAX_INPUT_TOKENS) -> list:
    """Ensure total message tokens stay under budget by trimming oldest history, then system context."""
    if messages_token_count(messages) <= max_tokens:
        return messages

    # Drop oldest non-system messages first (keep latest user question)
    trimmed = list(messages)
    while len(trimmed) > 2 and messages_token_count(trimmed) > max_tokens:
        # index 0 is system; remove index 1 (oldest history turn)
        trimmed.pop(1)

    if messages_token_count(trimmed) <= max_tokens:
        return trimmed

    # Last resort: truncate system message JSON tail
    system = trimmed[0]
    content = system.get("content", "")
    overhead = messages_token_count(trimmed[1:]) + estimate_tokens(CHAT_SYSTEM_RULES) + 32
    allowed = max(256, (max_tokens - overhead) * CHARS_PER_TOKEN)
    if len(content) > allowed:
        trimmed[0] = {
            **system,
            "content": content[:allowed] + "\n...(context truncated to fit free-tier API limits)",
        }
    return trimmed


def call_groq(client: Groq, messages: list, **kwargs) -> str:
    """Call Groq with model fallback. Prefers 70K-TPM compound models on free tier."""
    messages = fit_messages_to_budget(messages)
    last_error = None

    for i, model in enumerate(MODELS):
        for attempt in range(3):
            try:
                chat_completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs,
                )
                return chat_completion.choices[0].message.content.strip()
            except RateLimitError as e:
                last_error = e
                if attempt < 2:
                    time.sleep(2**attempt)
                    continue
                break
            except APIStatusError as e:
                last_error = e
                # 413 = request too large for this model's TPM cap; try next model
                if e.status_code in (413, 429):
                    if attempt < 2:
                        time.sleep(2**attempt)
                        continue
                    break
                if e.status_code >= 500:
                    if attempt < 2:
                        time.sleep(2**attempt)
                        continue
                    break
                break
            except Exception as e:
                last_error = e
                break

        if i < len(MODELS) - 1:
            time.sleep(1)

    raise last_error
