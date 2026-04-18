# 🧭 Repository Architecture Navigator

> **PS3 — Open Track Hackathon Project**  
> Instantly visualize any GitHub codebase as an interactive dependency graph with AI-powered insights.

![Landing Page](docs/landing.png)

## ✨ Features

| Feature | Description |
|---|---|
| 🕸️ **Dependency Graph** | Interactive React Flow graph of all file relationships |
| 🤖 **AI Summaries** | Plain-English explanation of every file via GPT-4o-mini |
| ⚡ **Entry Point Detection** | Automatically identifies main/index/app files |
| 🔥 **High-Impact Files** | NetworkX centrality scoring highlights risky files |
| 🔍 **NL Search** | "Where is authentication?" — AI-powered semantic search |
| 🗺️ **Onboarding Path** | Recommended reading order for new developers |
| 🔇 **Orphan Detection** | Finds unused/disconnected files (dead code candidates) |
| 📊 **Risk Analysis** | Impact score per file (0–100) |

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd backend
# Activate venv (Windows)
.\venv\Scripts\activate

# Add your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# Start server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React)

```bash
cd frontend
npm start
# Opens at http://localhost:3000
```

## 🏗️ Architecture

```
User enters GitHub URL
      ↓
FastAPI Backend
  ├── GitPython → Clone repo (shallow, depth=1)
  ├── Python AST + Regex → Parse imports, functions, classes
  ├── NetworkX → Build dependency graph + centrality
  ├── OpenAI GPT-4o-mini → Generate file summaries (batched)
  └── SQLite → Cache results for fast reload

React Frontend
  ├── React Flow → Interactive graph canvas
  ├── Custom Nodes → Color-coded by importance
  ├── Sidebar → Stats, onboarding path, NL search
  └── Right Panel → File details, dependencies, AI summary
```

## 🎨 Node Color Legend

| Color | Meaning |
|---|---|
| 🟢 Green | Entry point (main, index, app) |
| 🔴 Red | High-impact (>50% centrality score) |
| 🟡 Amber | Medium-impact |
| 🔵 Blue | Normal files |
| ⚫ Gray | Orphan files (no imports or dependents) |

## 📦 Tech Stack

**Frontend:** React · React Flow · Tailwind CSS · Lucide Icons · Axios  
**Backend:** FastAPI · Python AST · NetworkX · GitPython · OpenAI · SQLite · aiosqlite  

## 🔑 Environment Variables

```env
# backend/.env
OPENAI_API_KEY=sk-your-key-here
```
> **Note:** AI summaries work without a key — the system falls back to heuristic summaries based on function/class names.

## 📁 Project Structure

```
repo-architecture-navigator/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ArchitectureGraph.jsx  # React Flow canvas
│       │   ├── FilePanel.jsx          # File details sidebar
│       │   ├── SearchBar.jsx          # NL search
│       │   ├── StatsPanel.jsx         # Stats + high-impact files
│       │   └── OnboardingPath.jsx     # Recommended reading order
│       ├── pages/
│       │   ├── Landing.jsx            # URL input page
│       │   └── Dashboard.jsx          # Main analysis view
│       └── index.css                  # Global dark theme
└── backend/
    ├── main.py                        # FastAPI routes
    └── analyzer/
        ├── cloner.py                  # GitPython repo cloner
        ├── parser.py                  # Multi-language code parser
        ├── graph_builder.py           # NetworkX dependency graph
        ├── ai_engine.py               # OpenAI summaries + NL search
        └── db.py                      # SQLite cache layer
```

## 🌐 Deployment

**Frontend → Vercel**
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel
```

**Backend → Railway / Render**
```bash
# Set OPENAI_API_KEY in environment variables
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```
