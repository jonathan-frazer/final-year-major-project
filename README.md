# AI Header Commenter 🧠✨

An intelligent AI-powered code documentation assistant that automatically generates comprehensive header comments for your code files using Google Gemini 2.0 Flash LLM.

## 🚀 **Project Overview**

This project consists of two main components:

1. **FastAPI Backend** - REST API for AI-powered header generation
2. **VS Code Extension** - Seamless integration with your development workflow

## 🏗️ **Architecture**

```
AI Header Commenter/
├── FastAPI Backend/          # Python FastAPI server
│   ├── main.py              # Core API logic
│   ├── requirements.txt     # Python dependencies
│   ├── config.yaml         # Configuration (API keys, etc.)
│   └── README.md           # Backend documentation
├── VS Code Extension/       # VS Code extension
│   ├── src/extension.ts    # Extension logic
│   ├── package.json        # Extension metadata
│   └── README.md           # Extension documentation
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🔧 **Features**

### **AI-Powered Documentation**

- **Comprehensive Headers**: PURPOSE, EXAMPLE, RELATED CLASSES, AUTHOR, CREATED
- **Multiline Examples**: Support for detailed usage patterns with `\n` line breaks
- **Language-Aware**: Supports 8 major OOP languages with proper comment syntax
- **Smart Detection**: Prevents overwriting existing AI-generated headers

### **Professional Comment Format**

- **Multiline Comments**: Beautiful, readable comment blocks
- **NeuroDoc Identifier**: Unique "NeuroDoc" marker for AI-generated content
- **Language-Specific Syntax**: Proper comment syntax for each programming language

### **VS Code Integration**

- **Workspace Command**: Generate headers for all code files in workspace
- **Single File Command**: Generate header for currently open file
- **Smart Filtering**: Only processes supported code file types

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

## 🚀 **Quick Start**

### **1. Backend Setup**

```bash
cd "FastAPI Backend"
pip install -r requirements.txt
python main.py
```

### **2. Extension Installation**

```bash
cd "VS Code Extension"
npm install
npm run compile
```

### **3. Configuration**

- Copy `config.yaml.example` to `config.yaml`
- Add your Google Gemini API key
- Update host/port if needed

## 📋 **Usage**

### **VS Code Commands**

1. **Generate AI Header Comments** - Process entire workspace
2. **Generate Header for Current File** - Process active editor

### **API Endpoints**

- `POST /api/generate-header` - Generate header for code file
- `GET /` - Health check
- `GET /health` - Detailed health status

## 🔒 **Security & Configuration**

### **Important: API Keys**

- **NEVER commit `config.yaml`** - Contains sensitive API keys
- Use `.env` files for local development
- The `.gitignore` file is configured to protect sensitive data

### **Protected Files**

The `.gitignore` file automatically excludes:

- Configuration files with API keys
- Dependencies and build artifacts
- Cache and temporary files
- IDE-specific files
- Test files and logs

## 🧪 **Testing**

### **Backend Testing**

```powershell
cd "FastAPI Backend"
.\test_streamlined.ps1
```

### **Extension Testing**

1. Press `F5` in VS Code to launch extension host
2. Use commands in the new window
3. Check output panel for logs

## 📚 **Documentation**

- **[Backend README](FastAPI%20Backend/README.md)** - Detailed API documentation
- **[Extension README](VS%20Code%20Extension/README.md)** - Extension usage guide
- **[API Examples](FastAPI%20Backend/README.md#api-examples)** - Request/response examples

## 🛠️ **Development**

### **Prerequisites**

- Python 3.8+
- Node.js 16+
- Google Gemini API key
- VS Code (for extension development)

### **Build Commands**

```bash
# Backend
cd "FastAPI Backend"
python main.py

# Extension
cd "VS Code Extension"
npm run compile
npm run package
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

- **Issues**: Create GitHub issues for bugs or feature requests
- **Documentation**: Check the README files in each component
- **API Reference**: See the FastAPI backend documentation

## 🔮 **Future Enhancements**

- [ ] Support for more programming languages
- [ ] Custom comment templates
- [ ] Batch processing improvements
- [ ] Integration with other IDEs
- [ ] Comment quality scoring

---

**Made with ❤️ and AI by the NeuroDoc Team**
