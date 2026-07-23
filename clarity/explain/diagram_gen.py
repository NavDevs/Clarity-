import os
import json
from typing import Dict, Any
from groq import Groq

def generate_diagram_data(stack_data: dict, structure_data: dict) -> Dict[str, Any]:
    """
    Transforms the repository structure into a high-level logical architecture graph using Groq.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    
    fallback_data = {
        "nodes": [{"id": "node_1", "label": "Application Core", "filename": "Root", "category": "logic"}],
        "edges": []
    }
    
    if not api_key:
        print("GROQ_API_KEY not set. Using fallback diagram.")
        return fallback_data
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are an expert Software Architect analyzing a code repository.
    I will provide you with the detected technology stack and the repository folder/file structure.
    
    Your task is to identify the 5 to 12 CORE high-level architectural modules of this system (e.g., "Frontend UI", "API Gateway", "Authentication Service", "Database Models", "Core Logic", etc.) and how they interact with each other.
    
    Tech Stack:
    {json.dumps(stack_data, indent=2)}
    
    Folder/File Structure:
    {json.dumps(structure_data, indent=2)}
    
    REQUIREMENTS:
    1. Output strictly valid JSON. Do not include markdown blocks like ```json or any conversational text.
    2. The JSON must have exactly this schema:
    {{
      "nodes": [
        {{
          "id": "unique_string_id",
          "label": "Module Name (e.g., Auth Service)",
          "filename": "MUST be an EXACT valid file or folder path from the provided Folder/File Structure (e.g. backend/src). If it spans the whole repo, use '.'",
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
        chat_completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        parsed_data = json.loads(response_text)
        
        # Validate schema loosely
        if "nodes" in parsed_data and "edges" in parsed_data:
            return parsed_data
        else:
            return fallback_data
            
    except Exception as e:
        print(f"Failed to generate diagram with AI: {e}")
        return fallback_data
