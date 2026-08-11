import json
from pathlib import Path
from typing import Dict, List
import re

def detect_stack(repo_path: Path, pipeline_data: Dict[str, List[str]] = None) -> Dict[str, List[str]]:
    """
    Parses manifest files in the repo to detect the technology stack.
    Returns a dictionary of categories to lists of technologies.
    """
    stack = {
        "frontend": [],
        "backend": [],
        "database": [],
        "infra": [],
        "tools": [],
        "ai": [],
        "validation": [],
        "mobile": []
    }
    
    dependencies = []
    
    # 0. AST Graph Fallback (highest accuracy)
    if pipeline_data:
        for file_name, imports in pipeline_data.items():
            for imp in imports:
                if imp.lower() not in dependencies and not imp.startswith('.'):
                    dependencies.append(imp.lower())
    
    
    # Python - requirements.txt
    req_file = repo_path / "requirements.txt"
    if req_file.exists():
        stack["backend"].append("Python")
        try:
            content = req_file.read_text(encoding="utf-8")
            for line in content.splitlines():
                line = line.split('#')[0].strip()
                if line:
                    pkg_name = re.split(r'[<>=!~]', line)[0].strip().lower()
                    dependencies.append(pkg_name)
        except Exception:
            pass
            
    # Python - pyproject.toml
    pyproject_file = repo_path / "pyproject.toml"
    if pyproject_file.exists():
        stack["backend"].append("Python")
        try:
            content = pyproject_file.read_text(encoding="utf-8")
            # Simple regex to catch basic dependencies in arrays like dependencies = ["pkg>=1.0"]
            for match in re.finditer(r'[\'"]([a-zA-Z0-9_\-]+)[<>=!~]+.*?[\'"]', content):
                dependencies.append(match.group(1).lower())
            for match in re.finditer(r'([a-zA-Z0-9_\-]+)\s*=\s*[\'"].*?[\'"]', content):
                dependencies.append(match.group(1).lower())
        except Exception:
            pass
            
    # Node.js - package.json
    package_json = repo_path / "package.json"
    if package_json.exists():
        try:
            with open(package_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                for dep in deps:
                    dependencies.append(dep.lower())
                
                if not stack["frontend"] and not stack["backend"]:
                    stack["tools"].append("Node.js")
        except Exception:
            pass
            
    # Go
    if (repo_path / "go.mod").exists():
        stack["backend"].append("Go")
        
    # Docker
    if (repo_path / "Dockerfile").exists() or (repo_path / "docker-compose.yml").exists():
        stack["infra"].append("Docker")
        
    # Java / Android
    if (repo_path / "pom.xml").exists():
        stack["backend"].append("Java")
        
    if (repo_path / "build.gradle").exists() or (repo_path / "build.gradle.kts").exists() or (repo_path / "settings.gradle").exists() or (repo_path / "android").exists():
        stack["mobile"].append("Android")
        try:
            bg_path = repo_path / "build.gradle"
            if bg_path.exists():
                content = bg_path.read_text(encoding="utf-8")
                for match in re.finditer(r'implementation\s+[\'"]([^\'"]+)[\'"]', content):
                    pkg = match.group(1).split(':')[-2] if ':' in match.group(1) else match.group(1)
                    dependencies.append(pkg.lower())
        except Exception:
            pass
            
    # iOS
    if (repo_path / "Podfile").exists() or (repo_path / "Package.swift").exists() or (repo_path / "ios").exists():
        stack["mobile"].append("iOS")
        if (repo_path / "Podfile").exists():
            try:
                content = (repo_path / "Podfile").read_text(encoding="utf-8")
                for match in re.finditer(r'pod\s+[\'"]([^\'"]+)[\'"]', content):
                    dependencies.append(match.group(1).lower())
            except Exception:
                pass
                
    # Flutter
    pubspec = repo_path / "pubspec.yaml"
    if pubspec.exists():
        stack["mobile"].append("Flutter")
        stack["mobile"].append("Dart")
        try:
            content = pubspec.read_text(encoding="utf-8")
            in_deps = False
            for line in content.splitlines():
                if line.startswith("dependencies:"):
                    in_deps = True
                    continue
                elif line.startswith("dev_dependencies:") or (line and not line.startswith(" ") and not line.startswith("#")):
                    in_deps = False
                if in_deps and line.strip() and not line.strip().startswith("#"):
                    pkg = line.split(":")[0].strip()
                    dependencies.append(pkg.lower())
        except Exception:
            pass
        
    # Map dependencies to categories
    for dep in dependencies:
        if dep in ("react", "react-dom", "vue", "next", "nuxt", "svelte", "angular"):
            if dep.capitalize() not in stack["frontend"]: stack["frontend"].append(dep.capitalize())
        if dep in ("tailwindcss", "bootstrap", "sass", "styled-components", "emotion"):
            if dep.capitalize() not in stack["frontend"]: stack["frontend"].append(dep.capitalize())
            
        if dep in ("express", "fastapi", "flask", "django", "nestjs", "koa", "hapi", "sails"):
            if dep.capitalize() not in stack["backend"]: stack["backend"].append(dep.capitalize())
            
        if dep in ("pydantic", "joi", "zod", "marshmallow", "yup", "class-validator"):
            if dep.capitalize() not in stack["validation"]: stack["validation"].append(dep.capitalize())
            
        if dep in ("mongoose", "prisma", "sequelize", "sqlalchemy", "psycopg2", "pymongo", "asyncpg", "typeorm"):
            if dep.capitalize() not in stack["database"]: stack["database"].append(dep.capitalize())
            
        if dep in ("openai", "anthropic", "google-genai", "google-generativeai", "langchain", "transformers"):
            if dep.capitalize() not in stack["ai"]: stack["ai"].append(dep.capitalize())
            
        if dep in ("redis", "celery", "rabbitmq", "kafka", "cors", "dotenv", "helmet", "morgan", "nodemon"):
            if dep.capitalize() not in stack["infra"]: stack["infra"].append(dep.capitalize())
            
        if dep in ("react-native", "expo", "flutter", "alamofire", "kingfisher", "retrofit", "glide", "room", "xamarin", "ionic", "capacitor", "cordova"):
            if dep.capitalize() not in stack["mobile"]: stack["mobile"].append(dep.capitalize())
            
        # Catch-all for unmapped dependencies so they appear in the Tech Stack
        mapped = False
        for cat in stack.values():
            if dep.capitalize() in cat or dep in cat or dep.lower() in cat:
                mapped = True
                break
        
        if not mapped:
            if "libraries" not in stack:
                stack["libraries"] = []
            stack["libraries"].append(dep.capitalize())

    # Ensure unique and remove empty categories
    result = {}
    for k, v in stack.items():
        unique_v = list(set(v))
        if unique_v:
            result[k] = unique_v
            
    return result
