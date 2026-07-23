import os
from pathlib import Path
from typing import Dict, Any

def classify_folders(repo_path: Path) -> Dict[str, Any]:
    """
    Scans the repository and classifies folders based on common patterns.
    Returns a tree structure with labels.
    """
    structure = {"root": {"path": str(repo_path), "type": "root", "children": []}}
    
    # Common mappings
    folder_roles = {
        "src": "source code",
        "tests": "testing",
        "docs": "documentation",
        "api": "API endpoints",
        "frontend": "frontend app",
        "backend": "backend app",
        "components": "UI components",
        "scripts": "utility scripts",
        "routes": "API Layer",
        "middleware": "Middleware",
        "controllers": "Controllers",
        "models": "Data Models",
        "views": "Views",
        "config": "Configuration"
    }
    
    exclude_dirs = {".git", "venv", "__pycache__", "node_modules", "dist", "build"}
    
    max_depth = 0
    total_files = 0
    
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        rel_root = Path(root).relative_to(repo_path)
        depth = len(rel_root.parts) if str(rel_root) != "." else 0
        if depth > max_depth:
            max_depth = depth
            
        total_files += len(files)
        
        if str(rel_root) == ".":
            # Add top level dirs
            for d in dirs:
                role = folder_roles.get(d.lower(), "general directory")
                structure["root"]["children"].append({
                    "name": d,
                    "role": role,
                    "type": "directory"
                })
                
    structure["root"]["file_count"] = total_files
    structure["root"]["max_depth"] = max_depth
            
    return structure

def get_file_role(filepath: str) -> str:
    """
    Given a filepath, returns a human-readable architectural role.
    """
    filename = Path(filepath).name
    name = filename.lower()
    
    # Handle external modules / packages that are common
    if name in ("react", "next", "vue", "angular", "svelte", "express", "fastapi", "django", "flask"):
        return f"{name.title()} Framework"
    if name in (".", "..", "@"):
        return "Internal Module"
        
    if name in ("main.py", "app.py", "server.py", "core.py", "index.js", "app.js", "server.js", "main.ts", "index.ts", "server.ts", "app.ts", "page.tsx", "page.jsx", "layout.tsx", "layout.jsx", "middleware.ts", "middleware.js"):
        return "Core Application"
    if name in ("cli.py", "manage.py", "console.py", "runner.py", "cli.js", "bin/www"):
        return "CLI Entry Point"
    if name in ("models.py", "db.py", "database.py", "repository.py", "crud.py", "db.js", "database.js"):
        return "Database Layer"
    if name in ("schema.py", "schemas.py", "validators.py", "validation.py", "types.py", "validators.js", "schemas.js", "types.ts"):
        return "Validation Layer"
    if name in ("routes.py", "views.py", "urls.py", "controllers.py", "api.py", "routers.py", "routes.js", "controllers.js", "api.js", "route.ts", "route.js"):
        return "API Router / Handlers"
    if name in ("auth.py", "security.py", "permissions.py", "jwt.py", "auth.js", "security.js"):
        return "Security & Auth"
    if name in ("utils.py", "helpers.py", "common.py", "config.py", "settings.py", "dependencies.py", "utils.js", "config.js"):
        return "Utilities & Config"
    if name in ("__init__.py",):
        return "Module Initialization"
        
    # If no specific mapping, just format the name nicely
    clean_name = name.replace(".py", "").replace(".js", "").replace(".ts", "").replace(".jsx", "").replace(".tsx", "").replace("_", " ").title()
    return f"{clean_name} Module"
