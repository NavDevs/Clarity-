import os
import re
import json
import time
import hashlib
from groq import Groq, RateLimitError, APIStatusError
from clarity.explain.groq_utils import (
    call_groq,
    compact_json,
    shrink_context,
    build_chat_system_message,
    fit_messages_to_budget,
    MAX_INPUT_TOKENS,
    estimate_tokens,
)

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
    {compact_json(stack_data)}
    
    Structure:
    {compact_json(structure_data)}
    
    Pipeline:
    {compact_json(pipeline_data)}
    """
    
    try:
        result = call_groq(client, [{"role": "user", "content": prompt}])
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

    level = 0
    safe_context = shrink_context(context_data, level=level)
    system_content = build_chat_system_message(safe_context)
    while estimate_tokens(system_content) > MAX_INPUT_TOKENS - 512 and level < 3:
        level += 1
        safe_context = shrink_context(context_data, level=level)
        system_content = build_chat_system_message(safe_context)

    messages = [{"role": "system", "content": system_content}]

    if history:
        for msg in history[-2:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")[:1500]})

    messages.append({"role": "user", "content": question})
    messages = fit_messages_to_budget(messages)

    try:
        result = call_groq(client, messages, temperature=0.3)
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

    safe_context = shrink_context(context_data or {}, level=1)
    prompt = f"""
    You are an expert technical interviewer. Create a very short interview brief for the technology: {tech_name}.
    Context of the repository it was found in:
    {compact_json(safe_context)}
    
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
        result = call_groq(client, [{"role": "user", "content": prompt}], temperature=0.2)
        result = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", result).strip()
        result = re.sub(r"(?i)^.*?here'?s a thinking process:?\s*", "", result).strip()
        result = result.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        return f"Brief unavailable due to API error: {str(e)}"
