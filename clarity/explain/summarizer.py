import os
import re
import json
import time
import hashlib
from functools import lru_cache
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "groq/compound",
    "openai/gpt-oss-120b",
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
    
    Stack:
    {json.dumps(stack_data, indent=2)}
    
    Structure:
    {json.dumps(structure_data, indent=2)}
    
    Pipeline:
    {json.dumps(pipeline_data, indent=2)}
    """
    
    try:
        result = _call_groq(client, [{"role": "user", "content": prompt}])
        result = re.sub(r"<think>.*?</think>", "", result, flags=re.DOTALL).strip()
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
    
    prompt = f"""
    You are Clarity AI — an elite, world-class software architect and code intelligence engine with expert-level depth.
    You have been given the full metadata of a repository: its exact tech stack, folder structure, file names, and dependency call graph.
    A user is asking you a specific question about this repository.

    ABSOLUTE RULES — NEVER VIOLATE THESE:
    1. **Use the context as your primary source.** Look into filenames, folder names, package names, logic flow, and README text to infer technical details about the repository.
    2. **Blend in your own expert knowledge.** If the repository context does not contain the exact answer, or if the user asks an out-of-context software question, YOU MUST answer it using your own intelligence and general software engineering knowledge.
    3. **NEVER refuse to answer.** Do not say "The repository context does not contain this information" or complain about missing context. Just give the best, most intelligent technical answer possible.
    4. **Use rich Markdown** — bold key terms, use code blocks for file paths, functions, and class names.
    5. **NEVER reveal or mention internal temp paths** (e.g. `/tmp/clarity_repo_...`). Always use relative paths from the repo root.
    6. **Be direct, authoritative, and extremely accurate.** You are an expert. Provide enough detail to fully answer the user's question, including code logic where applicable.

    Repository Context (Tech Stack, Folder Structure, File Names, and Call Graph):
    {json.dumps(context_data, indent=2)}
    """
    
    messages = [{"role": "system", "content": prompt}]
    
    if history:
        for msg in history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": question})
    
    try:
        result = _call_groq(client, messages, temperature=0.3)
        return re.sub(r"<think>.*?</think>", "", result, flags=re.DOTALL).strip()
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
    
    prompt = f"""
    You are an expert technical interviewer. I need an interview brief for the technology: {tech_name}.
    Context of the repository it was found in:
    {json.dumps(context_data, indent=2)}
    
    Provide a very brief, easy-to-understand explanation using markdown.
    **CRITICAL RULES:**
    1. The ENTIRE response MUST be exactly 2 to 3 short bullet points. Do not write paragraphs.
    2. Do NOT use section headers (like ### Primary Use Case).
    3. Focus on what it is, why it was chosen (trade-offs), and how it is used here.
    4. If the exact implementation details of {tech_name} are NOT in the context, DO NOT GUESS OR INFER. Just state its standard use case.
    
    Do not add extra conversational text.
    """
    try:
        result = _call_groq(client, [{"role": "user", "content": prompt}], temperature=0.3)
        result = re.sub(r"<think>.*?</think>", "", result, flags=re.DOTALL).strip()
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        return f"Brief unavailable due to API error: {str(e)}"
