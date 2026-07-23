import tempfile
from pathlib import Path
import os
import shutil
import json
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from clarity.database import engine, Base, get_db
from clarity.models import User, ScanHistory
from clarity.auth import verify_password, get_password_hash, create_access_token, decode_access_token

Base.metadata.create_all(bind=engine)

# Import existing logic
from clarity.explain.fetcher import fetch_repo, cleanup_repo
from clarity.explain.stack_detector import detect_stack
from clarity.explain.structure_mapper import classify_folders
from clarity.explain.pipeline_tracer import trace_pipeline
from clarity.explain.summarizer import generate_summary, answer_question
from clarity.explain.diagram_gen import generate_diagram_data
from clarity.audit.checker import check_env_vars
from clarity.audit.scanner import scan_directory
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Clarity Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the React build — works both locally and on Render
DIST_DIR = Path(__file__).resolve().parent.parent / "clarity-engine" / "dist"

class AnalyzeRequest(BaseModel):
    repo_url: str

class ChatRequest(BaseModel):
    question: str
    context: dict
    history: list = []
    scan_id: int | None = None

class AuthRequest(BaseModel):
    username: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str

security = HTTPBearer(auto_error=False)

def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    if not username:
        return None
    return db.query(User).filter(User.username == username).first()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    user = get_current_user_optional(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# Mount Vite's static assets (only if dist is built)
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

@app.get("/")
async def root():
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"status": "API running. Frontend not built yet."}

# Catch-all: serve index.html for all non-API routes (supports hash routing on reload)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Don't intercept API routes
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
        
    # Check if the requested file actually exists (like favicon.svg)
    requested_file = DIST_DIR / full_path
    if requested_file.is_file():
        return FileResponse(str(requested_file))
        
    # Otherwise, fallback to index.html for client-side routing
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    raise HTTPException(status_code=404, detail="Frontend not built")

@app.post("/api/auth/register")
def register(req: AuthRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(req.password)
    user = User(username=req.username, password_hash=hashed_password, auth_provider="local")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username, "auth_provider": user.auth_provider}

@app.post("/api/auth/login")
def login(req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or user.auth_provider != "local" or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username, "auth_provider": user.auth_provider}

@app.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # For local development without a real client ID configured, we can allow a mock payload
        # if the user doesn't have a real client ID yet.
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        
        if req.credential.startswith("mock_"):
            # Accept a mock token for development
            email = req.credential.replace("mock_", "")
        else:
            if not client_id:
                raise ValueError("GOOGLE_CLIENT_ID not set on server")
            
            # Verify the real token
            idinfo = id_token.verify_oauth2_token(
                req.credential, google_requests.Request(), client_id, clock_skew_in_seconds=10
            )
            email = idinfo['email']
            
        if not email:
            raise HTTPException(status_code=400, detail="Google token did not contain an email")
            
        user = db.query(User).filter(User.username == email).first()
        
        if not user:
            # Create a new user from Google
            user = User(username=email, password_hash="", auth_provider="google")
            db.add(user)
            db.commit()
            db.refresh(user)
            
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer", "username": user.username, "auth_provider": user.auth_provider}
        
    except ValueError as e:
        print(f"Google Token Verification Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google token")

@app.put("/api/auth/update_password")
def update_password(req: UpdatePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"status": "success"}

@app.get("/api/history")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(ScanHistory).filter(ScanHistory.user_id == current_user.id).order_by(ScanHistory.created_at.desc()).all()
    return [{"id": h.id, "repo_url": h.repo_url, "repo_name": h.repo_name, "scan_data": json.loads(h.scan_data), "created_at": h.created_at} for h in history]

@app.post("/api/analyze")
async def analyze_repo(req: AnalyzeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    repo_url = req.repo_url
    if not repo_url or "github.com" not in repo_url:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
        
    repo_path = None
    
    try:
        # 1. Fetch repo
        repo_path = fetch_repo(repo_url)
        
        # 2. Run Audit Logic
        env_status, missing_vars = check_env_vars(repo_path)
        
        raw_secrets = scan_directory(str(repo_path))
        secrets = [{"file": str(Path(p).relative_to(repo_path)), "line": l, "type": "Secret"} for p, l, _ in raw_secrets]
        
        # 3. Run Explain Logic
        pipeline_data = trace_pipeline(repo_path)
        stack_data = detect_stack(repo_path, pipeline_data)
        structure_data = classify_folders(repo_path)
        
        # Combine stats
        stats_data = {
            "file_count": structure_data["root"].get("file_count", 0),
            "folder_depth": structure_data["root"].get("max_depth", 0),
            "entry_points": len(pipeline_data.keys())
        }
        
        summary_text = generate_summary(stack_data, structure_data, pipeline_data)
        diagram_data = generate_diagram_data(stack_data, structure_data)
        
        result = {
            "audit": {
                "env_status": env_status,
                "missing_env_vars": missing_vars,
                "secrets": secrets
            },
            "explain": {
                "summary": summary_text,
                "stack": stack_data,
                "diagram": diagram_data,
                "stats": stats_data,
                "context": {
                    "stack": stack_data,
                    "structure": structure_data,
                    "pipeline": pipeline_data
                }
            }
        }
        
        if current_user:
            url_parts = repo_url.split('/')
            new_repo_name = f"{url_parts[-2]}/{url_parts[-1]}" if len(url_parts) >= 2 else repo_url
            history_entry = ScanHistory(user_id=current_user.id, repo_url=repo_url, repo_name=new_repo_name, scan_data=json.dumps(result))
            db.add(history_entry)
            db.commit()
            result["scan_id"] = history_entry.id
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if repo_path:
            cleanup_repo(repo_path)

@app.post("/api/chat")
async def chat_repo(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_optional)):
    try:
        answer = answer_question(req.context, req.question, req.history)
        
        # Persist chat history if scan_id is provided
        if req.scan_id and current_user:
            scan = db.query(ScanHistory).filter(ScanHistory.id == req.scan_id, ScanHistory.user_id == current_user.id).first()
            if scan:
                scan_data = json.loads(scan.scan_data)
                chat_history = req.history.copy()
                chat_history.append({"role": "user", "content": req.question})
                chat_history.append({"role": "assistant", "content": answer})
                scan_data["chat_history"] = chat_history
                scan.scan_data = json.dumps(scan_data)
                db.commit()
                
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history/{scan_id}")
def delete_history_item(scan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id, ScanHistory.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    db.delete(scan)
    db.commit()
    return {"status": "success"}
