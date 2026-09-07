import os
import re
import json
import logging
import yaml
from pathlib import Path
from typing import Dict, Any, Optional

from clarity.explain.groq_utils import call_groq, compact_json, shrink_context

logger = logging.getLogger("clarity.diagram_gen")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_nodes(nodes: list) -> list:
    """Strip any accidental absolute /tmp/ paths from node filenames."""
    for node in nodes:
        if "filename" in node and node["filename"]:
            node["filename"] = re.sub(r"^/tmp/clarity_repo_[^/]+/", "", str(node["filename"]))
            node["filename"] = re.sub(r"^clarity_repo_[^/]+/", "", node["filename"])
            node["filename"] = node["filename"].lstrip("/")
    return nodes


# ---------------------------------------------------------------------------
# Pre-Analysis: extract concrete architectural signals from the raw repo
# ---------------------------------------------------------------------------

def _extract_architecture_signals(repo_path: Optional[Path]) -> dict:
    """
    Reads the actual file system to extract concrete signals that allow the AI
    to build a project-specific (not generic) architecture map.
    """
    signals = {
        "project_type": [],          # web, mobile, cli, library, microservices, monorepo
        "services": [],              # from docker-compose
        "entry_points": [],          # concrete entry files
        "top_level_folders": [],     # with roles
        "monorepo_packages": [],     # workspace/sub-package names
        "key_config_files": [],      # Dockerfile, .env.example, Makefile, etc.
        "scripts": {},               # npm/python scripts
        "api_routes_detected": [],   # route files found
        "background_workers": [],    # celery, bullmq, worker files
        "external_integrations": [], # stripe, twilio, sendgrid, etc.
    }

    if not repo_path or not repo_path.exists():
        return signals

    exclude = {".git", "venv", "__pycache__", "node_modules", "dist", "build", ".next", ".expo"}

    # -----------------------------------------------------------------------
    # 1. Docker-compose: extract named services
    # -----------------------------------------------------------------------
    for dc_name in ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"):
        dc_path = repo_path / dc_name
        if dc_path.exists():
            try:
                content = dc_path.read_text(encoding="utf-8")
                data = yaml.safe_load(content)
                if isinstance(data, dict) and "services" in data:
                    for svc_name, svc_cfg in (data["services"] or {}).items():
                        ports = svc_cfg.get("ports", []) if isinstance(svc_cfg, dict) else []
                        image = svc_cfg.get("image", "") if isinstance(svc_cfg, dict) else ""
                        signals["services"].append({
                            "name": svc_name,
                            "image": str(image),
                            "ports": ports[:2]
                        })
                signals["project_type"].append("containerized")
            except Exception:
                pass

    # -----------------------------------------------------------------------
    # 2. Monorepo detection
    # -----------------------------------------------------------------------
    for mono_file in ("lerna.json", "turbo.json", "nx.json", "pnpm-workspace.yaml"):
        if (repo_path / mono_file).exists():
            signals["project_type"].append("monorepo")
            break

    # Multiple package.json at depth-1 → monorepo workspaces
    pkg_jsons = list(repo_path.glob("*/package.json"))
    if len(pkg_jsons) >= 2:
        for p in pkg_jsons[:8]:
            signals["monorepo_packages"].append(str(p.parent.name))
        if "monorepo" not in signals["project_type"]:
            signals["project_type"].append("monorepo")

    # -----------------------------------------------------------------------
    # 3. Entry-point files (concrete, project-specific)
    # -----------------------------------------------------------------------
    ENTRY_PATTERNS = [
        "main.py", "app.py", "server.py", "run.py", "wsgi.py", "asgi.py",
        "server.js", "server.ts", "index.js", "index.ts", "app.js", "app.ts",
        "main.go", "main.dart", "Program.cs",
        "src/main.py", "src/app.py", "src/server.py",
        "src/index.js", "src/index.ts", "src/main.ts", "src/app.ts",
        "backend/server.js", "backend/app.js", "api/server.py", "api/index.js",
        "lib/main.dart",
    ]
    for ep in ENTRY_PATTERNS:
        ep_path = repo_path / ep
        if ep_path.exists():
            signals["entry_points"].append(ep)

    # -----------------------------------------------------------------------
    # 4. Top-level folder roles (rich mapping)
    # -----------------------------------------------------------------------
    FOLDER_ROLE_MAP = {
        "frontend": "Frontend Application", "client": "Client Application",
        "web": "Web Frontend", "ui": "UI Layer",
        "backend": "Backend API", "server": "Backend Server",
        "api": "API Layer", "services": "Microservices",
        "lib": "Library / Core Logic", "src": "Source Code",
        "worker": "Background Worker", "workers": "Background Workers",
        "jobs": "Job Queue / Tasks", "tasks": "Task Queue",
        "scripts": "Utility Scripts", "cli": "CLI Tool",
        "database": "Database Layer", "db": "Database Layer",
        "models": "Data Models", "schemas": "Data Schemas",
        "migrations": "DB Migrations", "seeders": "DB Seeders",
        "auth": "Authentication Service", "security": "Security Layer",
        "middleware": "Middleware Layer", "middlewares": "Middleware Layer",
        "routes": "API Routes", "controllers": "API Controllers",
        "handlers": "Request Handlers", "resolvers": "GraphQL Resolvers",
        "config": "Configuration", "configs": "Configuration",
        "utils": "Utilities", "helpers": "Helpers",
        "components": "UI Components", "pages": "Pages / Views",
        "hooks": "React Hooks", "store": "State Management",
        "redux": "Redux State", "context": "React Context",
        "ios": "iOS App", "android": "Android App",
        "mobile": "Mobile App", "app": "App Core",
        "packages": "Workspace Packages", "apps": "Workspace Apps",
        "platform": "Platform Services", "providers": "Service Providers",
        "gateway": "API Gateway", "proxy": "Proxy / Gateway",
        "infra": "Infrastructure", "terraform": "Infrastructure (Terraform)",
        "k8s": "Kubernetes Config", "helm": "Helm Charts",
        "nginx": "Web Server / Proxy", "docker": "Docker Config",
        "tests": "Test Suite", "test": "Test Suite",
        "__tests__": "Test Suite", "spec": "Test Specs",
        "docs": "Documentation", "public": "Public Assets",
        "static": "Static Files", "assets": "Assets",
    }
    top_dirs = [
        d for d in repo_path.iterdir()
        if d.is_dir() and d.name not in exclude
    ]
    for d in sorted(top_dirs, key=lambda x: x.name):
        role = FOLDER_ROLE_MAP.get(d.name.lower(), "")
        # Count files inside to skip trivial dirs
        try:
            file_count = sum(1 for _ in d.rglob("*") if _.is_file() and _.name not in exclude)
        except Exception:
            file_count = 0
        signals["top_level_folders"].append({
            "name": d.name,
            "role": role or d.name,
            "file_count": file_count
        })

    # -----------------------------------------------------------------------
    # 5. Root-level config files
    # -----------------------------------------------------------------------
    KEY_CONFIGS = [
        "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
        ".env.example", ".env.sample", "Makefile", "Procfile",
        "pubspec.yaml", "build.gradle", "build.gradle.kts", "pom.xml",
        "go.mod", "Cargo.toml", "requirements.txt", "pyproject.toml",
        "package.json",
    ]
    for cfg in KEY_CONFIGS:
        if (repo_path / cfg).exists():
            signals["key_config_files"].append(cfg)

    # -----------------------------------------------------------------------
    # 6. npm / python scripts
    # -----------------------------------------------------------------------
    pkg_json_root = repo_path / "package.json"
    if pkg_json_root.exists():
        try:
            pkg = json.loads(pkg_json_root.read_text(encoding="utf-8"))
            signals["scripts"] = {k: v for k, v in (pkg.get("scripts") or {}).items()
                                  if k in ("start", "dev", "build", "worker", "test", "serve")}
        except Exception:
            pass

    # -----------------------------------------------------------------------
    # 7. API route files
    # -----------------------------------------------------------------------
    ROUTE_GLOBS = [
        "routes/**/*.js", "routes/**/*.ts", "routes/**/*.py",
        "api/**/*.js", "api/**/*.ts", "api/**/*.py",
        "src/routes/**/*", "src/api/**/*",
        "src/pages/api/**/*",  # Next.js API routes
        "app/api/**/*",        # Next.js App Router
        "handlers/**/*",
    ]
    route_files = []
    for pattern in ROUTE_GLOBS:
        try:
            route_files.extend([
                str(f.relative_to(repo_path))
                for f in repo_path.glob(pattern)
                if f.is_file() and not any(ex in f.parts for ex in exclude)
            ])
        except Exception:
            pass
    signals["api_routes_detected"] = sorted(set(route_files))[:10]

    # -----------------------------------------------------------------------
    # 8. Background workers
    # -----------------------------------------------------------------------
    WORKER_PATTERNS = ["worker.py", "worker.js", "worker.ts", "celery.py",
                       "queue.py", "processor.py", "consumer.py", "jobs.py"]
    for wp in WORKER_PATTERNS:
        for found in repo_path.rglob(wp):
            if not any(ex in found.parts for ex in exclude):
                signals["background_workers"].append(str(found.relative_to(repo_path)))
    signals["background_workers"] = signals["background_workers"][:5]

    # -----------------------------------------------------------------------
    # 9. External integrations (from file content grep)
    # -----------------------------------------------------------------------
    INTEGRATION_PATTERNS = {
        "Stripe": r"stripe",
        "Twilio": r"twilio",
        "SendGrid": r"sendgrid",
        "Mailchimp": r"mailchimp",
        "AWS S3": r"aws.s3|boto3|@aws-sdk",
        "Firebase": r"firebase",
        "Supabase": r"supabase",
        "OpenAI": r"openai",
        "Google OAuth": r"google.oauth|google-auth",
        "Cloudinary": r"cloudinary",
        "Pusher": r"pusher",
        "Razorpay": r"razorpay",
        "PayPal": r"paypal",
    }
    # Quick scan of key files only to detect integrations
    scan_files = list(repo_path.glob("*.py")) + list(repo_path.glob("*.js")) + \
                 list(repo_path.glob("*.ts")) + list(repo_path.glob("requirements.txt")) + \
                 list(repo_path.glob("package.json"))
    scan_text = ""
    for sf in scan_files[:15]:
        try:
            scan_text += sf.read_text(encoding="utf-8", errors="ignore")[:2000]
        except Exception:
            pass

    for service_name, pattern in INTEGRATION_PATTERNS.items():
        if re.search(pattern, scan_text, re.IGNORECASE):
            signals["external_integrations"].append(service_name)

    # -----------------------------------------------------------------------
    # 10. Project type inference
    # -----------------------------------------------------------------------
    if not signals["project_type"]:
        if "pubspec.yaml" in signals["key_config_files"]:
            signals["project_type"].append("flutter_mobile_app")
        elif any(f in signals["key_config_files"] for f in ("build.gradle", "build.gradle.kts", "pom.xml")):
            signals["project_type"].append("android_java_app")
        elif any(f in ["ios", "android"] for f in [x["name"] for x in signals["top_level_folders"]]):
            signals["project_type"].append("react_native_mobile_app")
        elif "go.mod" in signals["key_config_files"]:
            signals["project_type"].append("go_service")
        elif "Cargo.toml" in signals["key_config_files"]:
            signals["project_type"].append("rust_service")
        elif any(ep.endswith(".py") for ep in signals["entry_points"]):
            signals["project_type"].append("python_backend")
        elif any(ep.endswith((".js", ".ts")) for ep in signals["entry_points"]):
            signals["project_type"].append("node_js_app")
        else:
            signals["project_type"].append("web_application")

    return signals


# ---------------------------------------------------------------------------
# Heuristic fallback (used when AI fails)
# ---------------------------------------------------------------------------

def _build_heuristic_graph(stack_data: dict, structure_data: dict,
                            pipeline_data: dict = None,
                            signals: dict = None) -> Dict[str, Any]:
    """
    Builds a rich, project-specific architecture graph using pre-extracted signals.
    Much more accurate than the old generic 3-node fallback.
    """
    nodes = []
    edges = []
    signals = signals or {}

    project_types = signals.get("project_type", [])
    services = signals.get("services", [])
    top_folders = signals.get("top_level_folders", [])
    workers = signals.get("background_workers", [])
    integrations = signals.get("external_integrations", [])
    mono_pkgs = signals.get("monorepo_packages", [])

    frontend_stack = stack_data.get("frontend", []) if isinstance(stack_data, dict) else []
    backend_stack = stack_data.get("backend", []) if isinstance(stack_data, dict) else []
    db_stack = stack_data.get("database", []) if isinstance(stack_data, dict) else []
    mobile_stack = stack_data.get("mobile", []) if isinstance(stack_data, dict) else []
    ai_stack = stack_data.get("ai", []) if isinstance(stack_data, dict) else []
    infra_stack = stack_data.get("infra", []) if isinstance(stack_data, dict) else []

    # --- If docker-compose defines concrete services, use those as nodes ---
    if len(services) >= 2:
        svc_ids = []
        for i, svc in enumerate(services[:8]):
            nid = f"node_svc_{i}"
            label = svc["name"].replace("-", " ").replace("_", " ").title()
            if svc.get("image"):
                label += f" ({svc['image'].split(':')[0].split('/')[-1]})"
            category = "database" if any(k in svc["name"].lower() for k in ("db", "postgres", "mysql", "mongo", "redis", "elastic")) else \
                       "tools" if any(k in svc["name"].lower() for k in ("redis", "queue", "rabbit", "kafka")) else "backend"
            folder = svc["name"]
            nodes.append({"id": nid, "label": label, "filename": folder, "category": category})
            svc_ids.append(nid)
        # Wire them sequentially (can't know real topology from names alone)
        for i in range(len(svc_ids) - 1):
            edges.append({"source": svc_ids[i], "target": svc_ids[i + 1]})
        return {"nodes": nodes, "edges": edges}

    # --- Monorepo: one node per workspace package ---
    if mono_pkgs:
        pkg_ids = []
        for i, pkg in enumerate(mono_pkgs[:8]):
            nid = f"node_pkg_{i}"
            label = pkg.replace("-", " ").replace("_", " ").title()
            nodes.append({"id": nid, "label": label, "filename": pkg, "category": "logic"})
            pkg_ids.append(nid)
        for i in range(len(pkg_ids) - 1):
            edges.append({"source": pkg_ids[i], "target": pkg_ids[i + 1]})
        return {"nodes": nodes, "edges": edges}

    # --- Flutter / Mobile ---
    if "flutter_mobile_app" in project_types or mobile_stack:
        mobile_label = f"{'Flutter' if 'Flutter' in mobile_stack else 'Mobile'} UI"
        nodes.append({"id": "node_ui", "label": mobile_label, "filename": "lib/screens", "category": "logic"})

        state_lib = next((x for x in (stack_data.get("libraries", []) or []) if "provider" in x.lower() or "bloc" in x.lower() or "riverpod" in x.lower()), None)
        state_label = f"State ({state_lib})" if state_lib else "State Management"
        nodes.append({"id": "node_state", "label": state_label, "filename": "lib/providers", "category": "logic"})
        edges.append({"source": "node_ui", "target": "node_state"})

        nodes.append({"id": "node_svc", "label": "Network Services", "filename": "lib/services", "category": "backend"})
        edges.append({"source": "node_state", "target": "node_svc"})

        if db_stack:
            nodes.append({"id": "node_local", "label": f"Local Storage ({db_stack[0]})", "filename": "lib/storage", "category": "database"})
            edges.append({"source": "node_ui", "target": "node_local"})

        nodes.append({"id": "node_api", "label": "External API", "filename": "api", "category": "backend"})
        edges.append({"source": "node_svc", "target": "node_api"})
        return {"nodes": nodes, "edges": edges}

    # --- Standard Web App ---
    center_id = "node_backend"

    if frontend_stack:
        f_label = f"Frontend ({frontend_stack[0]})"
        f_folder = next((x["name"] for x in top_folders if x["name"].lower() in ("frontend", "client", "web", "ui")), "src")
        nodes.append({"id": "node_frontend", "label": f_label, "filename": f_folder, "category": "logic"})
        edges.append({"source": "node_frontend", "target": "node_backend"})

    b_label = f"Backend API ({backend_stack[0]})" if backend_stack else "API & Core Logic"
    b_folder = next((x["name"] for x in top_folders if x["name"].lower() in ("backend", "server", "api", "src")), "src")
    nodes.append({"id": "node_backend", "label": b_label, "filename": b_folder, "category": "backend"})

    if db_stack:
        db_label = f"Database ({db_stack[0]})"
        nodes.append({"id": "node_db", "label": db_label, "filename": "db", "category": "database"})
        edges.append({"source": "node_backend", "target": "node_db"})

    auth_folder = next((x["name"] for x in top_folders if x["name"].lower() in ("auth", "security", "authentication")), None)
    if auth_folder:
        nodes.append({"id": "node_auth", "label": "Auth Service", "filename": auth_folder, "category": "validation"})
        edges.append({"source": "node_backend", "target": "node_auth"})

    if workers:
        nodes.append({"id": "node_worker", "label": "Background Worker", "filename": workers[0], "category": "tools"})
        edges.append({"source": "node_backend", "target": "node_worker"})

    if ai_stack:
        nodes.append({"id": "node_ai", "label": f"AI Layer ({ai_stack[0]})", "filename": "ai", "category": "tools"})
        edges.append({"source": "node_backend", "target": "node_ai"})

    if integrations:
        ext_label = f"External Services"
        nodes.append({"id": "node_ext", "label": ext_label, "filename": "external", "category": "infra"})
        edges.append({"source": "node_backend", "target": "node_ext"})

    if not nodes:
        nodes = [
            {"id": "node_core", "label": "Application Core", "filename": "src", "category": "logic"},
            {"id": "node_data", "label": "Data Layer", "filename": "data", "category": "database"},
        ]
        edges = [{"source": "node_core", "target": "node_data"}]

    return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Main: AI-driven diagram generation
# ---------------------------------------------------------------------------

def generate_diagram_data(stack_data: dict, structure_data: dict,
                          pipeline_data: dict = None,
                          repo_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Builds an accurate, project-specific Architecture Map using:
      1. Pre-extracted structural signals from the real file system
      2. A highly-constrained AI prompt that forbids generic nodes
      3. A rich heuristic fallback if AI fails
    """
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY")

    # Pre-extract architecture signals (works with or without AI)
    signals = _extract_architecture_signals(repo_path)

    if not api_key:
        logger.warning("GROQ_API_KEY not set. Using heuristic diagram.")
        return _build_heuristic_graph(stack_data, structure_data, pipeline_data, signals)

    client = Groq(api_key=api_key)
    slim_pipeline = shrink_context({"pipeline": pipeline_data or {}}, level=1).get("pipeline", {})

    # Build a concise, human-readable signal summary for the prompt
    signals_summary = []
    if signals["project_type"]:
        signals_summary.append(f"Project Type: {', '.join(signals['project_type'])}")
    if signals["services"]:
        svc_names = [s["name"] for s in signals["services"]]
        signals_summary.append(f"Docker Services: {', '.join(svc_names)}")
    if signals["monorepo_packages"]:
        signals_summary.append(f"Workspace Packages/Apps: {', '.join(signals['monorepo_packages'])}")
    if signals["entry_points"]:
        signals_summary.append(f"Entry Points: {', '.join(signals['entry_points'][:5])}")
    if signals["top_level_folders"]:
        folder_str = ", ".join(
            f"{x['name']}({x['role']})" for x in signals["top_level_folders"]
            if x.get("file_count", 0) > 0 and x["name"].lower() not in
            ("dist", "build", "docs", "public", "static", "assets", ".vscode", ".github")
        )
        signals_summary.append(f"Top-level Folders: {folder_str}")
    if signals["api_routes_detected"]:
        signals_summary.append(f"API Route Files: {', '.join(signals['api_routes_detected'][:5])}")
    if signals["background_workers"]:
        signals_summary.append(f"Background Workers: {', '.join(signals['background_workers'])}")
    if signals["external_integrations"]:
        signals_summary.append(f"External Integrations Detected: {', '.join(signals['external_integrations'])}")
    if signals["key_config_files"]:
        signals_summary.append(f"Config Files Present: {', '.join(signals['key_config_files'])}")
    if signals.get("scripts"):
        signals_summary.append(f"NPM Scripts: {signals['scripts']}")

    signals_block = "\n".join(f"  - {s}" for s in signals_summary) if signals_summary else "  (No signals detected)"

    frontend_stack = stack_data.get("frontend", []) if isinstance(stack_data, dict) else []
    backend_stack = stack_data.get("backend", []) if isinstance(stack_data, dict) else []
    db_stack = stack_data.get("database", []) if isinstance(stack_data, dict) else []
    mobile_stack = stack_data.get("mobile", []) if isinstance(stack_data, dict) else []
    ai_stack_list = stack_data.get("ai", []) if isinstance(stack_data, dict) else []
    all_stack_flat = frontend_stack + backend_stack + db_stack + mobile_stack + ai_stack_list

    prompt = f"""You are an expert Software Architect performing a code repository analysis for the Clarity Dashboard.
Your job is to produce a highly ACCURATE and PROJECT-SPECIFIC architecture map.

══════════════════════════════════════════════════
DETECTED SIGNALS (ground truth from the actual repo)
══════════════════════════════════════════════════
{signals_block}

DETECTED TECH STACK:
  Frontend: {frontend_stack}
  Backend: {backend_stack}
  Database: {db_stack}
  Mobile: {mobile_stack}
  AI/ML: {ai_stack_list}
  All Technologies: {all_stack_flat}

FOLDER STRUCTURE (top-level):
{compact_json(structure_data)}

PIPELINE (key files):
{compact_json(slim_pipeline)}

══════════════════════════════════════════════════
YOUR TASK
══════════════════════════════════════════════════
Produce a JSON architecture map with "nodes" and "edges".

STRICT RULES — VIOLATING ANY RULE MAKES THE OUTPUT USELESS:

1. EXTRACT BUSINESS LOGIC (CRITICAL): Do NOT just output a basic "Frontend → Backend → Database" map. That is too simple. You MUST break the application down into its core logical blocks based on the PIPELINE and FOLDERS.
   - For Backend: Identify specific layers like "Auth Middleware", "Payment Service", "Websocket Manager", "Email Scheduler", or "Data Access Layer".
   - For Frontend: Identify "State Management (Redux/Zustand)", "Router", or "API Client".

2. SPECIFIC NAMES REQUIRED: Every node `label` MUST mention the ACTUAL technology or specific feature, but be SHORT (max 3-4 words).
   ✅ GOOD: "Auth Middleware", "BullMQ Worker", "Redux Store", "Stripe Payment Service", "Express Router"
   ❌ BAD:  "API Server", "Backend" (too generic)
   ❌ BAD:  "Express API (server/src)" (DO NOT put paths in the label!)

3. MAP REAL FOLDERS: Put the actual folder path ONLY in the `filename` field.
   ✅ GOOD: "filename": "server/middlewares/auth.js"
   ❌ BAD:  "filename": "backend" (if the actual folder is "server")

4. DOCKER SERVICES: If Docker services were detected, include them as foundation nodes.

5. NODE COUNT: Generate between 6 and 10 nodes to capture the true complexity of the logic.

6. CATEGORIES (must be one of): logic | database | backend | tools | validation | infra

7. ALL NODES MUST BE CONNECTED: Every node must appear in at least one edge. Edges represent data flow or dependencies.

8. RETURN ONLY VALID JSON — no markdown, no explanation, no ```json fences. Just the raw object.

Output format:
{{
  "nodes": [
    {{"id": "node_1", "label": "Express API", "filename": "server/src", "category": "backend"}}
  ],
  "edges": [
    {{"source": "node_1", "target": "node_2"}}
  ]
}}"""

    try:
        response_text = call_groq(
            client,
            [{"role": "user", "content": prompt}],
            temperature=0.1,   # Very low temperature = more deterministic, less hallucination
        )

        # Strip thinking tags if any
        response_text = re.sub(r"<think>[\s\S]*?(?:</think>|$)", "", response_text).strip()
        # Strip markdown fences
        response_text = re.sub(r"^```(?:json)?\s*", "", response_text, flags=re.MULTILINE)
        response_text = re.sub(r"\s*```$", "", response_text, flags=re.MULTILINE)
        # Extract JSON object
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

            # Validate: ensure every node is connected
            connected_ids = set()
            for e in parsed_data["edges"]:
                connected_ids.add(e["source"])
                connected_ids.add(e["target"])
            # Drop orphan nodes
            parsed_data["nodes"] = [n for n in parsed_data["nodes"] if n["id"] in connected_ids]

            if len(parsed_data["nodes"]) >= 2:
                return parsed_data
            else:
                raise ValueError("Too few connected nodes after validation")
        else:
            raise ValueError("Parsed response missing valid nodes array")

    except Exception as e:
        logger.error(f"AI diagram generation failed: {e}. Using heuristic graph.")
        return _build_heuristic_graph(stack_data, structure_data, pipeline_data, signals)
