<div align="center">
  <img src="./clarity-engine/public/favicon.svg" alt="Clarity Logo" width="120" />
  <h1>Clarity Dashboard</h1>
  <p><strong>An AI-Powered Software Architecture Analysis Tool</strong></p>
  <p>
    <a href="https://clarity-8372.onrender.com/"><strong>🟢 Live Website: clarity-8372.onrender.com</strong></a>
  </p>
</div>

<hr />

## 🌟 What is it about?

**Clarity** is a cutting-edge developer tool designed to instantly understand, visualize, and audit any GitHub repository. By simply pasting a public GitHub repository URL, Clarity automatically fetches the code, analyzes its structure, and leverages the power of AI to generate a comprehensive architectural map of the system.

It bridges the gap between code and architecture by giving developers a "bird's-eye view" of how different components, modules, and services interact with each other in a complex codebase.

## 🚀 Why should it be used?

Understanding a new or undocumented codebase is traditionally one of the most time-consuming tasks for a software engineer. Clarity solves this by providing:

- **Instant Onboarding:** New developers can instantly grasp the high-level architecture of a project without spending days reading through hundreds of files.
- **Visual Architecture Mapping:** Automatically generates a beautiful, interactive dependency graph showing how modules interact (Frontend UI, API Gateway, Database Models, Core Logic, etc.).
- **Security & Environment Auditing:** Scans the codebase for missing `.env` variables and accidentally hardcoded secrets, ensuring best practices are followed.
- **AI-Powered Code Interaction:** Click on any node in the architecture map to instantly view the actual source code, and use the integrated AI Chat to ask specific questions about how that specific module works.
- **Documentation Generation:** Instantly summarizes the entire stack, pipeline, and file structure into plain, easy-to-understand English.

## 🛠️ Tech Stack

Clarity is built using a modern, full-stack architecture that combines high-performance backend processing with a beautiful, reactive frontend.

### Frontend
- **React.js (Vite):** Blazing fast frontend framework.
- **Tailwind CSS:** For sleek, modern, and responsive styling.
- **Motion (Framer Motion):** For fluid, engaging UI micro-animations and page transitions.
- **Dagre:** For automated, algorithmic layout of complex architecture graphs.

### Backend
- **FastAPI (Python):** High-performance backend framework for handling API requests and running analysis tasks asynchronously.
- **SQLAlchemy & PostgreSQL (Supabase):** Robust relational database for securely storing users, authentication details, and past repository scans.
- **Groq API (Llama 3.3 70B):** Lightning-fast LLM used for intelligent code summarization, architecture inference, and the interactive chatbot.
- **PyJWT & bcrypt:** For secure JWT-based authentication and password hashing.
- **Google OAuth 2.0:** For seamless, one-click social login.

## 📂 Structure of the Project

The repository is organized into a clean monolith, separating the React frontend (Engine) from the Python backend.

```text
Clarity/
├── clarity-engine/          # 🌐 Frontend React Application (Vite)
│   ├── src/
│   │   ├── components/      # UI Views (Architecture Map, Chat, Audit, Dashboard)
│   │   ├── data/            # Initial state and mock data
│   │   ├── App.tsx          # Main application routing and state management
│   │   ├── index.css        # Tailwind and custom CSS variables
│   │   └── types.ts         # TypeScript interfaces
│   └── public/              # Static assets (Favicon)
│
├── clarity/                 # ⚙️ Backend API & Processing Engine (FastAPI)
│   ├── audit/               # Security scanners (Secrets, Env vars)
│   ├── explain/             # Repo fetching, structure mapping, and AI Diagram Gen
│   ├── auth.py              # JWT authentication and hashing logic
│   ├── database.py          # SQLAlchemy connection setup
│   ├── models.py            # Database tables (Users, ScanHistory)
│   └── server.py            # Main FastAPI server and routing
│
├── requirements.txt         # Python dependencies
├── render.yaml              # Infrastructure-as-Code for Render deployment
└── .env.example             # Environment variable template
```
