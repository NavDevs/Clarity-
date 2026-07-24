import os
import json
import time
import hashlib
from functools import lru_cache
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "llama-3.3-70b-versatile",
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
    You are Clarity AI — an elite, world-class software architect and code intelligence engine with expert-level depth.
    You have been given the full metadata of a repository: its exact tech stack, folder structure, file names, and dependency call graph.
    A user is asking you a specific question about this repository.

    ABSOLUTE RULES — NEVER VIOLATE THESE:
    1. **You MUST derive your answer ONLY from the repository context provided below.** Read it thoroughly before responding. The answer is always somewhere in the data.
    2. **NEVER say "unfortunately", "I'm unable to", "it appears", "it seems", "it might be", "possibly", "likely", or any form of hedging or guessing.** These words are FORBIDDEN.
    3. **NEVER speculate or list possibilities.** If the exact answer exists in the context, state it directly and confidently. If a filename or class name is in the data, name it explicitly.
    4. **If the information truly cannot be found ANYWHERE in the provided context**, say exactly: "The repository context does not contain this information. To find this, check [specific file path from the context that is most relevant]." Then stop. Do not guess.
    5. **Be a detective, not a guesser.** Look into filenames, folder names, package names, dependency trees, import paths, and call graphs to infer exact technical details. A file named `random_forest_classifier.py` IS the algorithm. A dependency named `scikit-learn` with a file named `train.py` tells you exactly what framework and pipeline is used.
    6. **Use rich Markdown** — bold key terms, use code blocks for file paths and class names, use headers to organize long answers.
    7. **NEVER reveal or mention internal temp paths** (e.g. `/tmp/clarity_repo_...`). Always use relative paths from the repo root.
    8. **Be direct and authoritative.** You are an expert. State facts, not opinions.

    Repository Context (Tech Stack, Folder Structure, File Names, and Call Graph):
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
