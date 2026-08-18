import re
import os
import json
import time
from typing import Dict, Any, List
from groq import Groq, RateLimitError, APIStatusError

MODELS = [
    "groq/compound",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
]


def _sanitize_nodes(nodes: list) -> list:
    """Strip any accidental absolute /tmp/ paths from node filenames."""
    for node in nodes:
        if "filename" in node and node["filename"]:
            node["filename"] = re.sub(r"^/tmp/clarity_repo_[^/]+/", "", str(node["filename"]))
            node["filename"] = re.sub(r"^clarity_repo_[^/]+/", "", node["filename"])
            node["filename"] = node["filename"].lstrip("/")
    return nodes


def _call_groq(client: Groq, messages: list, **kwargs) -> str:
    """Call Groq API with retry logic and model fallback."""
    last_error = None
    
    for i, model in enumerate(MODELS):
        for attempt in range(2):  # Reduced retries for speed
            try:
                chat_completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **kwargs
                )
                return chat_completion.choices[0].message.content.strip()
            except RateLimitError as e:
                last_error = e
                if attempt < 1:
                    time.sleep(1)
                    continue
                break
            except APIStatusError as e:
                last_error = e
                if e.status_code in (429, 503) and attempt < 1:
                    time.sleep(1)
                    continue
                break
            except Exception as e:
                last_error = e
                break
        
        if i < len(MODELS) - 1:
            time.sleep(0.5)
    
    raise last_error


# ──────────────────────────────────────────────────────────────────────────────
# DETERMINISTIC DIAGRAM BUILDER (No AI required — always works)
# ──────────────────────────────────────────────────────────────────────────────

# Folders/files to completely ignore
_IGNORE = {
    ".git", "venv", "__pycache__", "node_modules", "dist", "build",
    ".idea", ".vscode", ".gradle", ".dart_tool", ".pub-cache",
    "android", "ios", "macos", "linux", "windows", "web",
    "test", "tests", "testing", "__tests__",
    "assets", "images", "fonts", "res", "resources",
    ".github", ".circleci",
}

# Map folder names → human-readable architectural labels + categories
_FOLDER_MAP = {
    "src": ("Source Code", "logic"),
    "lib": ("Core Library", "logic"),
    "app": ("Application", "logic"),
    "pages": ("Pages / Screens", "logic"),
    "screens": ("UI Screens", "logic"),
    "views": ("Views", "logic"),
    "components": ("UI Components", "logic"),
    "widgets": ("Widgets", "logic"),
    "api": ("API Layer", "backend"),
    "routes": ("API Routes", "backend"),
    "controllers": ("Controllers", "backend"),
    "handlers": ("Handlers", "backend"),
    "middleware": ("Middleware", "backend"),
    "models": ("Data Models", "database"),
    "database": ("Database", "database"),
    "db": ("Database", "database"),
    "schema": ("Schema", "validation"),
    "schemas": ("Schemas", "validation"),
    "services": ("Services", "backend"),
    "providers": ("State / Providers", "logic"),
    "store": ("State Store", "logic"),
    "state": ("State Management", "logic"),
    "redux": ("Redux Store", "logic"),
    "hooks": ("Custom Hooks", "logic"),
    "utils": ("Utilities", "tools"),
    "helpers": ("Helpers", "tools"),
    "config": ("Configuration", "infra"),
    "auth": ("Authentication", "backend"),
    "public": ("Static Assets", "infra"),
    "styles": ("Styles / CSS", "infra"),
    "constants": ("Constants", "tools"),
}

# Entry-point files that indicate "App Core"
_ENTRY_FILES = {
    "main.py", "app.py", "server.py", "index.js", "app.js", "server.js",
    "main.ts", "index.ts", "app.ts", "server.ts", "main.dart",
    "manage.py", "wsgi.py", "asgi.py",
}


def _build_deterministic_diagram(structure_data: dict, pipeline_data: dict = None) -> Dict[str, Any]:
    """
    Build a diagram purely from the folder structure and pipeline data.
    No AI calls — this ALWAYS succeeds.
    """
    nodes = []
    node_ids = set()
    children = structure_data.get("root", {}).get("children", [])
    
    # 1. Add an "App Core" entry point node
    nodes.append({
        "id": "app_core",
        "label": "App Core",
        "filename": ".",
        "category": "logic"
    })
    node_ids.add("app_core")
    
    # 2. Walk through top-level folders from structure_data
    for child in children:
        name = child.get("name", "").lower()
        if name in _IGNORE:
            continue
        
        if name in _FOLDER_MAP:
            label, category = _FOLDER_MAP[name]
        else:
            # Skip unknown tiny folders to keep it compact
            continue
        
        node_id = f"node_{name}"
        if node_id not in node_ids:
            nodes.append({
                "id": node_id,
                "label": label,
                "filename": child.get("name", name),
                "category": category
            })
            node_ids.add(node_id)
    
    # 3. If we got very few nodes from folders, try to extract from pipeline_data
    if pipeline_data and len(nodes) < 4:
        # Group pipeline files by their top-level directory
        dir_groups: Dict[str, int] = {}
        for filepath in pipeline_data.keys():
            if filepath.startswith("_"):
                continue
            parts = filepath.split("/")
            top_dir = parts[0] if len(parts) > 1 else "root"
            if top_dir.lower() in _IGNORE:
                continue
            dir_groups[top_dir] = dir_groups.get(top_dir, 0) + 1
        
        for dirname, count in sorted(dir_groups.items(), key=lambda x: -x[1]):
            name_lower = dirname.lower()
            if name_lower in _IGNORE:
                continue
            node_id = f"node_{name_lower}"
            if node_id in node_ids:
                continue
            
            if name_lower in _FOLDER_MAP:
                label, category = _FOLDER_MAP[name_lower]
            else:
                label = dirname.replace("_", " ").replace("-", " ").title()
                category = "logic"
            
            nodes.append({
                "id": node_id,
                "label": label,
                "filename": dirname,
                "category": category
            })
            node_ids.add(node_id)
            
            if len(nodes) >= 8:
                break
    
    # 4. Build edges — connect everything to App Core in a hub-spoke pattern
    edges = []
    non_core_ids = [n["id"] for n in nodes if n["id"] != "app_core"]
    
    for nid in non_core_ids:
        edges.append({"source": "app_core", "target": nid})
    
    # 5. Try to add smart cross-connections based on category
    category_map: Dict[str, List[str]] = {}
    for n in nodes:
        cat = n.get("category", "logic")
        category_map.setdefault(cat, []).append(n["id"])
    
    # Connect backend → database if both exist
    for backend_id in category_map.get("backend", []):
        for db_id in category_map.get("database", []):
            edges.append({"source": backend_id, "target": db_id})
    
    # Connect logic (screens/components) → backend if both exist  
    logic_nodes = category_map.get("logic", [])
    backend_nodes = category_map.get("backend", [])
    if logic_nodes and backend_nodes:
        # Connect the first logic node to the first backend node
        for lid in logic_nodes[:2]:
            if lid != "app_core" and backend_nodes:
                edges.append({"source": lid, "target": backend_nodes[0]})
    
    # Deduplicate edges
    seen_edges = set()
    unique_edges = []
    for e in edges:
        key = (e["source"], e["target"])
        if key not in seen_edges and e["source"] != e["target"]:
            seen_edges.add(key)
            unique_edges.append(e)
    
    return {"nodes": nodes, "edges": unique_edges}


# ──────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTION: Try AI first, fall back to deterministic builder
# ──────────────────────────────────────────────────────────────────────────────

def generate_diagram_data(stack_data: dict, structure_data: dict, pipeline_data: dict = None) -> Dict[str, Any]:
    """
    Generate architecture diagram data.
    Strategy: Try AI-based generation first. If it fails for ANY reason,
    fall back to the deterministic builder which ALWAYS produces a real diagram.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    
    # If no API key, go straight to deterministic
    if not api_key:
        print("GROQ_API_KEY not set. Using deterministic diagram builder.")
        return _build_deterministic_diagram(structure_data, pipeline_data)
    
    # Try AI-based generation
    try:
        client = Groq(api_key=api_key)
        
        prompt = f"""
    You are an expert Software Architect analyzing a code repository.
    Build a COMPACT Architecture Map with 5-7 nodes maximum.
    
    EXCLUDE: tests, assets, config files, platform wrappers (android/ios), utilities.
    INCLUDE ONLY: Core app logic, UI screens, API/backend, database, state management, auth.
    
    Tech Stack: {json.dumps(stack_data)}
    Folder Structure: {json.dumps(structure_data)}
    Code Logic: {json.dumps(pipeline_data or {})}
    
    Output ONLY valid JSON (no markdown, no explanation):
    {{"nodes": [{{"id": "string", "label": "Name", "filename": "relative/path", "category": "logic|database|backend|tools|validation|infra"}}], "edges": [{{"source": "id", "target": "id"}}]}}
    
    ALL nodes MUST be connected. ZERO isolated nodes.
    """
        
        response_text = _call_groq(
            client, 
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        # Strip <think> blocks
        response_text = re.sub(r"<think>.*?</think>", "", response_text, flags=re.DOTALL).strip()
        
        # Extract JSON object
        json_match = re.search(r"\{.*\}", response_text, flags=re.DOTALL)
        if json_match:
            response_text = json_match.group(0)
        
        parsed_data = json.loads(response_text)
        
        if "nodes" in parsed_data and "edges" in parsed_data and len(parsed_data["nodes"]) >= 2:
            parsed_data["nodes"] = _sanitize_nodes(parsed_data["nodes"])
            valid_ids = {str(n.get("id")).strip() for n in parsed_data["nodes"] if n.get("id")}
            sanitized_edges = []
            for e in parsed_data.get("edges", []):
                src = str(e.get("source", "")).strip()
                tgt = str(e.get("target", "")).strip()
                if src in valid_ids and tgt in valid_ids and src != tgt:
                    sanitized_edges.append({"source": src, "target": tgt})
            parsed_data["edges"] = sanitized_edges
            
            # Extra validation: if we got nodes but zero edges, AI output was broken
            if len(parsed_data["edges"]) == 0 and len(parsed_data["nodes"]) > 1:
                print("AI returned nodes but no valid edges. Falling back to deterministic.")
                return _build_deterministic_diagram(structure_data, pipeline_data)
            
            return parsed_data
        else:
            print("AI returned invalid structure. Falling back to deterministic.")
            return _build_deterministic_diagram(structure_data, pipeline_data)
            
    except Exception as e:
        print(f"AI diagram generation failed: {e}. Using deterministic builder.")
        return _build_deterministic_diagram(structure_data, pipeline_data)
