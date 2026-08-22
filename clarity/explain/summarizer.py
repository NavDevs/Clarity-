import os
import re
import json
import time
import hashlib
from functools import lru_cache
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "openai/gpt-oss-120b",
    "groq/compound-mini",
    "groq/compound",
    "qwen/qwen3.6-27b",
]

# Simple in-memory cache with TTL (1 hour)
_summary_cache = {}
_cache_ttl = 3600

def _cache_key(*args) -> str:
    """Generate cache key from input data."""
    content = json.dumps(args, sort_keys=True, default=str)
    return hashlib.sha256(content.encode()).hexdigest()[:32]

def _get_cached(key: str) -> str | None:
    """Get cached value if not expired."""
    if key in _summary_cache:
        value, timestamp = _summary_cache[key]
        if time.time() - timestamp < _cache_ttl:
            return value
        del _summary_cache[key]
    return None

def _set_cache(key: str, value: str) -> None:
    """Set cache value with current timestamp."""
    _summary_cache[key] = (value, time.time())

def _call_groq(client: Groq, messages: list, **kwargs) -> str:
    """Call Groq API with retry logic and model fallback."""
    last_error = None
    
    for i, model in enumerate(MODELS):
        for attempt in range(3):
            try:
                chat_completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs
                )
                return chat_completion.choices[0].message.content.strip()
            except RateLimitError as e:
                last_error = e
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                break
            except APIStatusError as e:
                last_error = e
                if e.status_code == 429:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    break
                if e.status_code >= 500:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    break
                break # For 400 (decommissioned), 404, etc., break immediately and try next model
            except Exception as e:
                last_error = e
                break
        
        if i < len(MODELS) - 1:
            time.sleep(1)
    
    raise last_error


def generate_summary(stack_data: dict, structure_data: dict, pipeline_data: dict) -> str:
    """
    Sends structured data to Groq API to generate a plain-English explanation.
    Uses in-memory cache (1hr TTL) to avoid repeated API calls for same repo.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Explanation unavailable: GROQ_API_KEY not set. Please get a free API key from https://console.groq.com/"
        
    # Check cache first
    cache_key = _cache_key(stack_data, structure_data, pipeline_data)
    cached = _get_cached(cache_key)
    if cached:
        return cached
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are a senior software architect explaining a repository to a junior developer or a non-technical stakeholder.
    Based on the following structured data extracted from the repository, provide an EXTREMELY short, easy-to-understand briefing.
    
    Requirements:
    1. Write in simple, easy-to-understand words. Avoid overly dense technical jargon where possible.
    2. STRICT RULE: Your entire response MUST be exactly 2 to 3 short bullet points. Do not write a long essay.
    3. Do not include detailed tables or long paragraphs. Just the most critical overview.
    4. Keep it engaging and clear.
    5. NEVER use HTML tags like `<br>` or `<br/>`. Always use standard markdown formatting (e.g., `\n\n` for line breaks, markdown lists).
    
    Stack:
    {json.dumps(stack_data, indent=2)}
    
    Structure:
    {json.dumps(structure_data, indent=2)}
    
    Pipeline:
    {json.dumps(pipeline_data, indent=2)}
    """
    
    try:
        result = _call_groq(client, [{"role": "user", "content": prompt}])
        result = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", result).strip()
        _set_cache(cache_key, result)
        return result
    except RateLimitError:
        return "Explanation temporarily unavailable: Rate limit exceeded. Please try again in a moment or check your Groq quota."
    except APIStatusError as e:
        if e.status_code == 503:
            return "Explanation temporarily unavailable: The AI model is currently experiencing high demand (503). However, you can explore the architecture diagram below."
        return f"Explanation unavailable due to API error: {e}"
    except Exception as e:
        return f"Explanation unavailable due to API error: {str(e)}"


def answer_question(context_data: dict, question: str, history: list = None) -> str:
    """
    Answers a specific user question about the repository based on the cached context and chat history.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Chat unavailable: GROQ_API_KEY not set. Please get a free API key from https://console.groq.com/"
        
    client = Groq(api_key=api_key)
    
    import copy
    safe_context = copy.deepcopy(context_data)
    
    # Aggressive truncation for chat prompt to stay well below 8000 TPM limit
    if "pipeline" in safe_context and isinstance(safe_context["pipeline"], dict):
        pipeline = safe_context["pipeline"]
        pipeline_items = {k: v for k, v in pipeline.items() if isinstance(v, dict)}
        if len(pipeline_items) > 10:
            # Keep only the 10 most logic-heavy files
            sorted_files = sorted(
                pipeline_items.items(), 
                key=lambda x: len(x[1].get('imports', [])) + len(x[1].get('functions', [])) + len(x[1].get('classes', [])), 
                reverse=True
            )
            safe_context["pipeline"] = dict(sorted_files[:10])
            safe_context["pipeline"]["_TRUNCATED_"] = f"And {len(pipeline_items) - 10} more files omitted to fit AI memory limits..."
            
    if "readme" in safe_context and isinstance(safe_context["readme"], str):
        if len(safe_context["readme"]) > 2000:
            safe_context["readme"] = safe_context["readme"][:2000] + "...(truncated)"
            
    if "structure" in safe_context and isinstance(safe_context["structure"], dict):
        def _truncate_children(node, max_children=15):
            if isinstance(node, dict) and "children" in node and isinstance(node["children"], list):
                if len(node["children"]) > max_children:
                    node["children"] = node["children"][:max_children] + [{"name": f"...and {len(node['children']) - max_children} more", "type": "omitted"}]
                for child in node["children"]:
                    _truncate_children(child, max_children)
        _truncate_children(safe_context.get("structure", {}).get("root", {}))

    prompt = f"""
    You are Clarity AI — an elite, world-class software architect and code intelligence engine with expert-level depth.
    You have been given the full metadata of a repository: its exact tech stack, folder structure, file names, and dependency call graph.
    A user is asking you a specific question about this repository.

    ABSOLUTE RULES — NEVER VIOLATE THESE:
    1. **Use the context as your primary source.** Look into filenames, folder names, package names, logic flow, and README text to infer technical details about the repository.
    2. **Blend in your own expert knowledge.** If the repository context does not contain the exact answer, or if the user asks an out-of-context software question, YOU MUST answer it using your own intelligence and general software engineering knowledge.
    3. **NEVER refuse to answer.** Do not say "The repository context does not contain this information" or complain about missing context. Just give the best, most intelligent technical answer possible.
    4. **Use rich Markdown** — bold key terms, use code blocks for file paths, functions, and class names.
    5. **Markdown Tables & Formatting**: Always use standard markdown spacing (`\n\n`) for paragraphs and lists. If generating markdown tables, keep every single row strictly on one line (e.g. `| Col 1 | Col 2 | Col 3 |`). Use `<br>` if you need multiple bullet points or line breaks inside a single table cell. Never put raw newlines inside a table row.
    6. **NEVER reveal or mention internal temp paths** (e.g. `/tmp/clarity_repo_...`). Always use relative paths from the repo root.
    7. **Be direct, authoritative, and extremely accurate.** You are an expert. Provide enough detail to fully answer the user's question, including code logic where applicable.
    8. **STRICTLY respect requested length.** If the user asks for a short answer (e.g., "for VIVA", "brief", "short"), you MUST provide a very concise, to-the-point answer without extra fluff, regardless of how complex the topic is.
    9. **Handle Conversational Chat Properly.** If the user is just saying hi, thanking you, or being conversational (e.g. "hi", "good", "thanks"), respond naturally and conversationally (e.g., "Hello! I'm ready to help you analyze this repository.") WITHOUT dumping a repository analysis. Only provide technical deep dives when explicitly asked about the code or architecture.

    Repository Context (Tech Stack, Folder Structure, File Names, and Call Graph):
    {json.dumps(safe_context, indent=2)}
    """
    
    messages = [{"role": "system", "content": prompt}]
    
    if history:
        # Keep only the last 4 messages (2 interactions) to strictly avoid memory limits
        for msg in history[-4:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": question})
    
    try:
        result = _call_groq(client, messages, temperature=0.3)
        result = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", result).strip()
        return result
    except RateLimitError:
        return "Sorry, I've hit the rate limit. Please wait a moment and try again."
    except APIStatusError as e:
        if e.status_code == 503:
            return "Sorry, the AI service is temporarily unavailable. Please try again shortly."
        return f"Sorry, I encountered an API error: {e}"
    except Exception as e:
        return f"Sorry, I encountered an error answering that: {str(e)}"


def generate_tech_brief(tech_name: str, context_data: dict) -> str:
    """
    Generates a short interview brief for a specific tech stack item using Groq AI.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Brief unavailable: GROQ_API_KEY not set. Please add a valid API key."
        
    cache_key = _cache_key("tech_brief", tech_name, context_data)
    cached = _get_cached(cache_key)
    if cached:
        return cached
        
    client = Groq(api_key=api_key)
    
    import copy
    safe_context = copy.deepcopy(context_data or {})
    if "pipeline" in safe_context and isinstance(safe_context["pipeline"], dict) and len(safe_context["pipeline"]) > 5:
        # Filter out string items like '_TRUNCATED_' before sorting
        pipeline_items = {k: v for k, v in safe_context["pipeline"].items() if isinstance(v, dict)}
        sorted_files = sorted(
            pipeline_items.items(), 
            key=lambda x: len(x[1].get('imports', [])) + len(x[1].get('functions', [])) + len(x[1].get('classes', [])), 
            reverse=True
        )
        safe_context["pipeline"] = dict(sorted_files[:5])
        safe_context["pipeline"]["_TRUNCATED_"] = "..."
    if "readme" in safe_context and isinstance(safe_context["readme"], str) and len(safe_context["readme"]) > 1000:
        safe_context["readme"] = safe_context["readme"][:1000] + "..."
        
    if "structure" in safe_context and isinstance(safe_context["structure"], dict):
        def _truncate_children_brief(node, max_children=10):
            if isinstance(node, dict) and "children" in node and isinstance(node["children"], list):
                if len(node["children"]) > max_children:
                    node["children"] = node["children"][:max_children] + [{"name": f"...and {len(node['children']) - max_children} more", "type": "omitted"}]
                for child in node["children"]:
                    _truncate_children_brief(child, max_children)
        _truncate_children_brief(safe_context.get("structure", {}).get("root", {}))

    prompt = f"""
    You are an expert technical interviewer. Create a very short interview brief for the technology: {tech_name}.
    Context of the repository it was found in:
    {json.dumps(safe_context, indent=2)}
    
    CRITICAL FORMATTING RULES:
    1. Output EXACTLY 2 short bullet points only. No more, no less.
    2. Each bullet must be 1 to 2 concise sentences:
       - Bullet 1: What it is and why it was chosen (key benefit/trade-off).
       - Bullet 2: How it is used in this repository (or its standard role if generic).
    3. Do NOT write paragraphs, essays, section headers, or intro/outro text.
    4. Do NOT output any thinking process or internal reasoning.
    5. NEVER use HTML tags like `<br>` or `<br/>`. Use standard markdown list bullets.
    """
    try:
        result = _call_groq(client, [{"role": "user", "content": prompt}], temperature=0.2)
        result = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", result).strip()
        result = re.sub(r"(?i)^.*?here'?s a thinking process:?\s*", "", result).strip()
        result = result.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        return f"Brief unavailable due to API error: {str(e)}"
