import os
import json
import time
import hashlib
from functools import lru_cache
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
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
                raise
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
    Based on the following structured data extracted from the repository, provide a detailed, multi-paragraph explanation of what this project does and how it works.
    
    Requirements:
    1. Write in simple, easy-to-understand words. Avoid overly dense technical jargon where possible.
    2. Use standard Markdown formatting. Include clear headings (e.g. ### Purpose, ### Architecture, ### Core Features).
    3. Use bullet points heavily for readability, breaking down complex information into concise, readable lists.
    4. Keep it engaging, clear, and perfectly formatted for a frontend Markdown renderer.
    
    Stack:
    {json.dumps(stack_data, indent=2)}
    
    Structure:
    {json.dumps(structure_data, indent=2)}
    
    Pipeline:
    {json.dumps(pipeline_data, indent=2)}
    """
    
    try:
        result = _call_groq(client, [{"role": "user", "content": prompt}])
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
    You are Clarity AI, a friendly, helpful, and highly intelligent AI software architecture assistant (similar in tone and behavior to ChatGPT).
    A user is asking a question about their repository metadata.
    
    CRITICAL RULES:
    1. Be conversational, polite, and exceptionally helpful, adopting a natural ChatGPT-like conversational tone.
    2. Provide answers that are colorful, engaging, and rich in detail, yet moderate in length. Use rich Markdown formatting (bolding, headers, lists, code blocks, blockquotes) to make your response visually appealing and easy to read.
    3. If the user asks a follow-up question, answer ONLY the follow-up contextually. Do not restate the entire project structure unless necessary.
    4. NEVER mention internal temporary absolute file paths (like C:\\Users\\...\\Temp\\clarity_repo_xyz). When referencing paths, ALWAYS use the relative repository paths (like /src, /client, /server).
    
    Repository Context (Tech Stack, Folder Structure, and Call Graph):
    {json.dumps(context_data, indent=2)}
    """
    
    messages = [{"role": "system", "content": prompt}]
    
    if history:
        for msg in history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": question})
    
    try:
        return _call_groq(client, messages)
    except RateLimitError:
        return "Sorry, I've hit the rate limit. Please wait a moment and try again."
    except APIStatusError as e:
        if e.status_code == 503:
            return "Sorry, the AI service is temporarily unavailable. Please try again shortly."
        return f"Sorry, I encountered an API error: {e}"
    except Exception as e:
        return f"Sorry, I encountered an error answering that: {str(e)}"
