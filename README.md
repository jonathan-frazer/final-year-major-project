# AI Code Documentation Generator(NeuroDoc)

An intelligent AI-powered code documentation assistant that automatically generates comprehensive header comments for your code files using LLM Technology.

## 🚀 **Installation**

### **1. Backend Setup**

```bash
cd "FastAPI Backend"
source .venv/Scripts/Activate
pip install -r requirements.txt
python main.py
```

In the Backend add a .env file with the following contents

```
GEMINI_API_KEY="YOUR API KEY HERE"
```

### **2. Extension Installation**

```bash
cd "VS Code Extension"
npm install
npm run compile
```

Then just press F5 to enter the EDH where you can use the following VS Code commands

## 🏗️ **Project Overview**

This project consists of two main components:

1. **FastAPI Backend** - REST API for AI-powered header generation
2. **VS Code Extension** - Seamless integration with your development workflow

### **VS Code Commands**

1. **Call AI Documentor (Workspace)** - Adds Documentation for entire workspace
2. **Call AI Documentor (Current File)** - Adds Documentation current file

Plans to introduce GraphRAG system for the finished version of the Project

### **API Endpoints**

- `POST /api/generate-header` - Generate header for code file
- `GET /` - Health check
- `GET /health` - Detailed health status

## 🌟 **Supported Languages**

| Language   | Extension | Comment Style                     |
| ---------- | --------- | --------------------------------- |
| Python     | `.py`     | `"""Multiline"""` + `# NeuroDoc`  |
| Java       | `.java`   | `/* Multiline */` + `// NeuroDoc` |
| C++        | `.cpp`    | `/* Multiline */` + `// NeuroDoc` |
| C          | `.c`      | `/* Multiline */` + `// NeuroDoc` |
| C#         | `.cs`     | `/* Multiline */` + `// NeuroDoc` |
| JavaScript | `.js`     | `/* Multiline */` + `// NeuroDoc` |
| TypeScript | `.ts`     | `/* Multiline */` + `// NeuroDoc` |
| PHP        | `.php`    | `/* Multiline */` + `// NeuroDoc` |
