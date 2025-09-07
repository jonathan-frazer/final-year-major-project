# AI Code Documentation Generator (NeuroDoc)

NeuroDoc generates AI-powered header comments and provides GraphRAG-based, workspace-scoped code understanding.

## Installation

### 1) Backend Setup

```bash
cd "FastAPI Backend"
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Create `FastAPI Backend/.env`:

```
GEMINI_API_KEY="YOUR API KEY HERE"
```

### 2) Extension Installation

```bash
cd "VS Code Extension"
npm install
npm run compile
```

Press F5 to launch the extension host.

## Project Overview

- FastAPI Backend: REST API for AI-powered header generation
- VS Code Extension: integrates AI docs and GraphRAG into your workflow

### VS Code Commands

- Generate AI Header (Entire Workspace)
- Generate AI Header (Current File)

GraphRAG is integrated for workspace-scoped analysis using Neo4j and vector search.

### API Endpoints

- POST /api/generate-header — generate header for a code file
- GET / — health check
- GET /health — detailed health status

## GraphRAG Setup & Usage

### 1) Neo4j (Enterprise) via Docker

- Ensure Docker Desktop is running.
- Start Neo4j and create vector indexes:

```
powershell -ExecutionPolicy Bypass -File "Neo4j Database/start_neo4j.ps1"
```

This will:

- Load `.env` (root or `FastAPI Backend/.env`) for `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `EMBEDDING_BACKEND`
- Start/attach to `neo4j-graphrag` on ports 7474/7687
- Create vector indexes `function_embedding` and `class_embedding` (1536 for `openai`, 384 for `local`)

### 2) Backend (.venv)

```
cd "FastAPI Backend"
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Configure `FastAPI Backend/.env`:

```
EMBEDDING_BACKEND=openai   # or local
OPENAI_API_KEY=sk-...
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
GEMINI_API_KEY=...
```

Tune GraphRAG in `FastAPI Backend/config.yaml`:

```
graphrag:
  top_k: 8
  fallback_top_k: 5
  request_timeout_seconds: 60
  max_context_tokens: 8192
  prelude_enabled: true
  workspace_scope: true
```

### 3) VS Code Extension

```
cd "VS Code Extension"
npm install
npm run compile
F5 to launch the extension host
```

Commands:

- NeuroDoc: Sync Graph — auto full-replace for new workspaces; incremental otherwise
- NeuroDoc: Run GraphRAG — writes to `NeuroDoc.md` at the workspace root

Notes:

- Graph sync is per-workspace and tags nodes with `workspaceId`
- RAG retrieval is filtered by workspace to avoid cross-project leakage

## Supported Languages

| Language   | Extension | Comment Style                     |
| ---------- | --------- | --------------------------------- |
| Python     | `.py`     | `"""Multiline"""` + `# NeuroDoc`  |
| Java       | `.java`   | `/* Multiline */` + `// NeuroDoc` |
| C++        | `.cpp`    | `/* Multiline */` + `// NeuroDoc` |
| C#         | `.cs`     | `/* Multiline */` + `// NeuroDoc` |
| JavaScript | `.js`     | `/* Multiline */` + `// NeuroDoc` |
| TypeScript | `.ts`     | `/* Multiline */` + `// NeuroDoc` |
