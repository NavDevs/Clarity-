<div align="center">
  <h1 style="color: #FF3D00; font-family: monospace;">CLARITY</h1>
  <p><strong>Intelligent Architectural Mapping & Security Auditing</strong></p>
</div>

Clarity is an AI-powered developer tool that takes any GitHub repository and instantly generates an animated architecture map, audits for hardcoded secrets, and answers complex context-aware questions about the codebase.

## Tech Stack
- **Backend**: Python, FastAPI, SQLAlchemy (SQLite)
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **AI / LLM**: Groq API
- **Auth**: Google OAuth + Local Auth

## Local Development Setup

### 1. Backend (FastAPI)
1. Navigate to the root directory
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file based on `.env.example`
6. Run the server: `uvicorn clarity.server:app --reload`
   *(Backend will run on http://127.0.0.1:8000)*

### 2. Frontend (React)
1. Open a second terminal and navigate to `clarity-engine/`
2. Install dependencies: `npm install`
3. Start the Vite dev server: `npm run dev`
   *(Frontend will run on http://localhost:5173)*

## Deployment (Render)

This project is configured for **Render.com** via the included `render.yaml`. 
It deploys as a single Web Service where FastAPI serves the pre-built React static files.

1. Create a new Web Service on Render and connect your GitHub repo.
2. Render will automatically detect the `render.yaml` configuration.
3. **Important:** Add the following Environment Variables in the Render dashboard:
   - `GROQ_API_KEY`: Your Groq API key for AI reasoning.
   - `SECRET_KEY`: A secure random string for JWT signing.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `DATABASE_URL`: (Optional) Use a Postgres URL here if you want to switch off SQLite.
