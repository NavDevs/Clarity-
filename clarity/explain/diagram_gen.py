import re

def _sanitize_nodes(nodes: list) -> list:
    """Strip any accidental absolute /tmp/ paths from node filenames."""
    for node in nodes:
        if "filename" in node and node["filename"]:
            node["filename"] = re.sub(r"^/tmp/clarity_repo_[^/]+/", "", str(node["filename"]))
            node["filename"] = re.sub(r"^clarity_repo_[^/]+/", "", node["filename"])
            node["filename"] = node["filename"].lstrip("/")
    return nodes

import os
import json
import time
from typing import Dict, Any
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "groq/compound",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
]

FALLBACK_DATA = {
    "nodes": [{"id": "node_1", "label": "Application Core", "filename": ".", "category": "logic"}],
    "edges": []
}

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


def generate_diagram_data(stack_data: dict, structure_data: dict, pipeline_data: dict = None) -> Dict[str, Any]:
    """
    Transforms the repository structure into a high-level logical architecture graph using Groq.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        print("GROQ_API_KEY not set. Using fallback diagram.")
        return FALLBACK_DATA
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are an expert Software Architect analyzing a code repository.
    I will provide you with the detected technology stack, the folder/file structure, and potentially the code flow logic (functions and classes).
    
    Your task is to build a HIGHLY ACCURATE but EXTREMELY COMPACT Architecture Map (Arch Map).
    To prevent visual clutter, you MUST group related files and logic into high-level logical domains/services. 
    CRITICAL INSTRUCTIONS FOR SIMPLICITY:
    - NEVER generate more than 8 nodes in total (6 to 8 is ideal).
    - EXCLUDE entirely all boilerplate, configuration, tests, assets, utilities, constants, and basic platform integrations (e.g., android/ ios/ wrappers) UNLESS they contain absolutely critical business logic.
    - ONLY include the most vital and necessary blocks (e.g. App Core, Core UI Screens, State Management, Database/API Services). Keep it focused on the big picture.
    
    Tech Stack:
    {json.dumps(stack_data, indent=2)}
    
    Folder/File Structure (and Flow Logic):
    {json.dumps(structure_data, indent=2)}
    
    Pipeline Data (Call Graphs & Imports):
    {json.dumps(pipeline_data or {}, indent=2)}
    
    REQUIREMENTS:
    1. Output strictly valid JSON. Do not include markdown blocks like ```json or any conversational text.
    2. The JSON must have exactly this schema:
    {{
      "nodes": [
        {{
          "id": "unique_string_id",
          "label": "Module Name (e.g., Auth Service)",
          "filename": "MUST be a SHORT RELATIVE path from the repo root (e.g. 'src/auth.py', 'backend', 'client/src'). NEVER use absolute paths. If it spans the whole repo, use '.'",
          "category": "One of: logic, database, backend, tools, validation, infra"
        }}
      ],
      "edges": [
        {{
          "source": "source_node_id",
          "target": "target_node_id"
        }}
      ]
    }}
    3. Ensure the graph is logically connected where it makes sense (e.g. Frontend connects to API, API connects to Database).
    4. CRITICAL: ALL nodes MUST be connected to at least one other node. There must be ZERO isolated nodes in the final graph. Double check that every node 'id' appears in the 'edges' array as either a source or target.
    """
    
    try:
        response_text = _call_groq(
            client, 
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        parsed_data = json.loads(response_text)
        
        if "nodes" in parsed_data and "edges" in parsed_data:
            parsed_data["nodes"] = _sanitize_nodes(parsed_data["nodes"])
            valid_ids = {str(n.get("id")).strip() for n in parsed_data["nodes"] if n.get("id")}
            sanitized_edges = []
            for e in parsed_data.get("edges", []):
                src = str(e.get("source", "")).strip()
                tgt = str(e.get("target", "")).strip()
                if src in valid_ids and tgt in valid_ids and src != tgt:
                    sanitized_edges.append({"source": src, "target": tgt})
            parsed_data["edges"] = sanitized_edges
            return parsed_data
        else:
            return FALLBACK_DATA
            
    except Exception as e:
        print(f"Failed to generate diagram with AI: {e}")
        return FALLBACK_DATA
