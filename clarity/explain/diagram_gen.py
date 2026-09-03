import os
import re
import json
import logging
from typing import Dict, Any
from groq import Groq
from clarity.explain.groq_utils import call_groq, compact_json, shrink_context

logger = logging.getLogger("clarity.diagram_gen")

def _sanitize_nodes(nodes: list) -> list:
    """Strip any accidental absolute /tmp/ paths from node filenames."""
    for node in nodes:
        if "filename" in node and node["filename"]:
            node["filename"] = re.sub(r"^/tmp/clarity_repo_[^/]+/", "", str(node["filename"]))
            node["filename"] = re.sub(r"^clarity_repo_[^/]+/", "", node["filename"])
            node["filename"] = node["filename"].lstrip("/")
    return nodes

def _build_heuristic_graph(stack_data: dict, structure_data: dict, pipeline_data: dict = None) -> Dict[str, Any]:
    """Generates a rich, connected fallback architecture graph from detected stack and folder patterns."""
    nodes = []
    edges = []
    
    frontend_stack = stack_data.get("frontend", []) if isinstance(stack_data, dict) else []
    backend_stack = stack_data.get("backend", []) if isinstance(stack_data, dict) else []
    db_stack = stack_data.get("database", []) if isinstance(stack_data, dict) else []
    
    # 1. Frontend Node
    f_label = f"Frontend UI ({', '.join(frontend_stack[:2])})" if frontend_stack else "Client Application"
    nodes.append({"id": "node_frontend", "label": f_label, "filename": "src", "category": "logic"})
    
    # 2. Backend API Node
    b_label = f"Backend API ({', '.join(backend_stack[:2])})" if backend_stack else "API & Core Logic"
    nodes.append({"id": "node_backend", "label": b_label, "filename": "api", "category": "backend"})
    
    # Connect UI to API
    edges.append({"source": "node_frontend", "target": "node_backend"})
    
    # 3. Database Node
    if db_stack:
        db_label = f"Database Layer ({', '.join(db_stack[:2])})"
        nodes.append({"id": "node_db", "label": db_label, "filename": "db", "category": "database"})
        edges.append({"source": "node_backend", "target": "node_db"})
    
    # 4. Add key entry files from pipeline
    if isinstance(pipeline_data, dict) and len(pipeline_data) > 0:
        added = 0
        for f in list(pipeline_data.keys()):
            fname = str(f).split("/")[-1]
            if fname and fname not in ["__init__.py", "setup.py"]:
                nid = f"node_file_{added}"
                nodes.append({"id": nid, "label": fname, "filename": f, "category": "tools"})
                edges.append({"source": "node_backend", "target": nid})
                added += 1
                if len(nodes) >= 6:
                    break

    return {"nodes": nodes, "edges": edges}

def generate_diagram_data(stack_data: dict, structure_data: dict, pipeline_data: dict = None) -> Dict[str, Any]:
    """
    Transforms the repository structure into a high-level logical architecture graph using Groq AI.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not set. Using smart heuristic diagram.")
        return _build_heuristic_graph(stack_data, structure_data, pipeline_data)
        
    client = Groq(api_key=api_key)
    slim_pipeline = shrink_context({"pipeline": pipeline_data or {}}, level=1).get("pipeline", {})
    
    prompt = f"""
    You are an expert Software Architect analyzing a code repository.
    I will provide you with the detected technology stack, the folder/file structure, and key pipeline files.
    
    Your task is to build an accurate, compact, and connected Architecture Map (Arch Map).
    
    Tech Stack:
    {compact_json(stack_data)}
    
    Folder/File Structure:
    {compact_json(structure_data)}
    
    Pipeline Data:
    {compact_json(slim_pipeline)}
    
    OUTPUT FORMAT — Return strictly a JSON object with this structure:
    {{
      "nodes": [
        {{
          "id": "node_frontend",
          "label": "Frontend (e.g. Next.js UI)",
          "filename": "frontend",
          "category": "logic"
        }},
        {{
          "id": "node_api",
          "label": "Backend (e.g. Express API)",
          "filename": "backend",
          "category": "backend"
        }},
        {{
          "id": "node_db",
          "label": "Database Layer",
          "filename": "db",
          "category": "database"
        }}
      ],
      "edges": [
        {{
          "source": "node_frontend",
          "target": "node_api"
        }},
        {{
          "source": "node_api",
          "target": "node_db"
        }}
      ]
    }}
    
    RULES:
    1. Generate between 4 to 8 meaningful domain nodes (e.g. Client UI, API Gateway, Auth Service, Database/Queue, Worker).
    2. Category must be one of: logic, database, backend, tools, validation, infra.
    3. Filenames must be relative paths or folder names (e.g. 'src', 'app', 'backend').
    4. EVERY node must be connected by at least one edge in the 'edges' array.
    """
    
    try:
        response_text = call_groq(
            client, 
            [{"role": "user", "content": prompt}],
            temperature=0.2
        )
        
        response_text = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", response_text).strip()
        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            response_text = json_match.group(0)
            
        parsed_data = json.loads(response_text)
        
        if "nodes" in parsed_data and isinstance(parsed_data["nodes"], list) and len(parsed_data["nodes"]) >= 2:
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
            return _build_heuristic_graph(stack_data, structure_data, pipeline_data)
            
    except Exception as e:
        logger.error(f"Failed to generate diagram with AI: {e}. Using heuristic graph.")
        return _build_heuristic_graph(stack_data, structure_data, pipeline_data)

