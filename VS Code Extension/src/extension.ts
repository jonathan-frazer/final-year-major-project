import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// File extension to comment syntax mapping
const COMMENT_SYNTAX_MAP: { [key: string]: { start: string; end?: string } } = {
  // Main OOP Programming languages only
  '.py': { start: '#' },      // Python
  '.java': { start: '//' },   // Java
  '.cpp': { start: '//' },    // C++
  '.c': { start: '//' },      // C
  '.cs': { start: '//' },     // C#
  '.js': { start: '//' },     // JavaScript
  '.ts': { start: '//' },     // TypeScript
  '.php': { start: '//' }     // PHP
};

// File extensions to ignore (non-code files)
const IGNORED_EXTENSIONS = [
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.db', '.sqlite', '.mdb', '.accdb',
  '.log', '.tmp', '.temp', '.cache'
];

// Directories to ignore
const IGNORED_DIRECTORIES = [
  'node_modules', '.git', '.vscode', 'dist', 'build', 'out',
  'target', 'bin', 'obj', '.vs', '.idea', '.cache'
];

// API Configuration
const API_BASE_URL = 'http://localhost:8000';
const API_ENDPOINT = '/api/generate-header';

interface HeaderComment {
  purpose: string;
  example: string;
  related_classes: string;
  author: string;
  created: string;
}

interface AIResponse {
  success: boolean;
  original_content: string;
  header_comment: HeaderComment;
  modified_content: string;
  language: string;
  filename: string;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Header Commenter extension is now active!');

  // Command 1: Process entire workspace
  let workspaceCommand = vscode.commands.registerCommand('aiHeaderCommenter.callAIDocumentor', async () => {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace first.');
        return;
      }

      const workspaceFolder = workspaceFolders[0];
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "Generating AI Documentation for Workspace...",
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        const files = await getAllFiles(workspaceFolder.uri.fsPath);
        const codeFiles = files.filter(file => isCodeFile(file));
        
        if (codeFiles.length === 0) {
          vscode.window.showInformationMessage('No code files found in the workspace.');
          return;
        }

        progress.report({ message: `Found ${codeFiles.length} code files to process` });

        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;

        for (const file of codeFiles) {
          try {
            progress.report({ 
              message: `Processing ${path.basename(file)} (${processedCount + 1}/${codeFiles.length})` 
            });

            const result = await processFileWithAI(file);
            if (result) {
              successCount++;
            } else {
              errorCount++;
            }
            
            processedCount++;
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            errorCount++;
            processedCount++;
          }
        }

        progress.report({ message: 'Workspace documentation generation completed!' });
        
        // Show final results
        const message = `AI Documentation completed!\n✅ Success: ${successCount}\n❌ Errors: ${errorCount}`;
        vscode.window.showInformationMessage(message);
      });

    } catch (error) {
      console.error('Error in AI Documentor:', error);
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Command 2: Process currently open file
  let currentFileCommand = vscode.commands.registerCommand('aiHeaderCommenter.generateHeaderForCurrentFile', async () => {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      
      if (!activeEditor) {
        vscode.window.showErrorMessage('No active text editor found. Please open a code file first.');
        return;
      }

      const document = activeEditor.document;
      const filePath = document.fileName;
      const filename = path.basename(filePath);
      
      // Check if it's a supported code file
      if (!isCodeFile(filePath)) {
        vscode.window.showErrorMessage(`File type not supported: ${filename}`);
        return;
      }

      // Check if file already has a header comment
      const content = document.getText();
      if (hasHeaderComment(content, filename)) {
        const result = await vscode.window.showInformationMessage(
          `File ${filename} already has an AI-generated header. Do you want to regenerate it?`,
          'Yes', 'No'
        );
        
        if (result !== 'Yes') {
          return;
        }
      }

      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: `Generating AI Header for ${filename}...`,
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        progress.report({ message: 'Analyzing code and generating header...' });
        
        const result = await processFileWithAI(filePath);
        
        if (result) {
          // Reload the document to show the new header
          await document.save();
          vscode.window.showInformationMessage(`✅ AI header generated successfully for ${filename}`);
        } else {
          vscode.window.showErrorMessage(`❌ Failed to generate AI header for ${filename}`);
        }
      });

    } catch (error) {
      console.error('Error generating header for current file:', error);
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  context.subscriptions.push(workspaceCommand, currentFileCommand);
}

async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const items = await fs.promises.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = await fs.promises.stat(fullPath);
      
      if (stat.isDirectory()) {
        if (!IGNORED_DIRECTORIES.includes(item)) {
          const subFiles = await getAllFiles(fullPath);
          files.push(...subFiles);
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return !IGNORED_EXTENSIONS.includes(ext) && COMMENT_SYNTAX_MAP.hasOwnProperty(ext);
}

async function processFileWithAI(filePath: string): Promise<boolean> {
  try {
    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    // Check if file already has a header comment
    if (hasHeaderComment(content, filename)) {
      console.log(`File ${filename} already has a header comment, skipping...`);
      return true;
    }

    // Call AI API
    const aiResponse = await callAIApi(content, filename);
    
    if (aiResponse && aiResponse.success) {
      // Write the modified content back to the file
      await fs.promises.writeFile(filePath, aiResponse.modified_content, 'utf-8');
      console.log(`Successfully added AI header to ${filename}`);
      return true;
    } else {
      console.error(`AI API failed for ${filename}:`, aiResponse);
      return false;
    }

  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

async function callAIApi(content: string, filename: string): Promise<AIResponse | null> {
  try {
    const requestBody = {
      content: content,
      filename: filename
    };

    const postData = JSON.stringify(requestBody);
    const url = new URL(`${API_BASE_URL}${API_ENDPOINT}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const responseData = JSON.parse(data);
              resolve(responseData as AIResponse);
            } else {
              reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.error('Error calling AI API:', error);
    
    // Show user-friendly error message
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      vscode.window.showErrorMessage(
        'Failed to connect to AI API. Make sure the FastAPI server is running on localhost:8000'
      );
    } else {
      vscode.window.showErrorMessage(`AI API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return null;
  }
}

function hasHeaderComment(content: string, filename: string): boolean {
  // Check if file already has an AI-generated header by looking for the special identifier
  const aiHeaderIdentifier = "NeuroDoc";
  
  // Look for the AI header identifier in the first few lines
  const lines = content.split('\n');
  const searchLines = Math.min(20, lines.length); // Check first 20 lines
  
  for (let i = 0; i < searchLines; i++) {
    const line = lines[i].trim();
    // Check if the line contains the identifier in a single-line comment
    if (line.includes(aiHeaderIdentifier) && (line.startsWith('#') || line.startsWith('//'))) {
      return true; // File already has AI-generated header
    }
  }
  
  return false; // No AI-generated header found
}

export function deactivate() {}
