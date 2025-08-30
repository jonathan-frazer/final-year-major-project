import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getAllFiles, isCodeFile, hasHeaderComment } from './utils';
import { processFileWithAI } from './fileProcessor';
import { AI_HEADER_IDENTIFIER } from './constants';

/**
 * Command to generate AI documentation for the entire workspace
 */
export async function generateAIDocumentationWorkspace(): Promise<void> {
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
      const message = `AI Documentation completed!\n❌ Errors: ${errorCount}\n✅ Success: ${successCount}`;
      vscode.window.showInformationMessage(message);
    });

  } catch (error) {
    console.error('Error in AI Documentor:', error);
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Command to generate AI documentation for the currently open file
 */
export async function generateAIDocumentationCurrentFile(): Promise<void> {
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
}

/**
 * Command to generate AI documentation for all files in the current file's folder
 */
export async function generateAIDocumentationCurrentFolder(): Promise<void> {
  try {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active text editor found. Please open a code file first.');
      return;
    }

    const document = activeEditor.document;
    const currentFilePath = document.fileName;
    const currentFolder = path.dirname(currentFilePath);
    const folderName = path.basename(currentFolder);
    
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: `AI Doc Target: ${folderName}...`,
      cancellable: false
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      progress.report({ message: 'Scanning folder for code files...' });
      
      // Get all files in the current folder (non-recursive)
      let files: string[] = [];
      try {
        const items = await fs.promises.readdir(currentFolder);
        files = items
          .map(item => path.join(currentFolder, item))
          .filter(async (filePath) => {
            try {
              const stat = await fs.promises.stat(filePath);
              return stat.isFile();
            } catch {
              return false;
            }
          });
        
        // Filter out non-files synchronously after the async filter
        const fileStats = await Promise.all(
          items.map(async (item) => {
            const filePath = path.join(currentFolder, item);
            try {
              const stat = await fs.promises.stat(filePath);
              return { path: filePath, isFile: stat.isFile() };
            } catch {
              return { path: filePath, isFile: false };
            }
          })
        );
        
        files = fileStats
          .filter(({ isFile }) => isFile)
          .map(({ path }) => path);
        
      } catch (error) {
        vscode.window.showErrorMessage(`Error reading folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Filter for code files only
      const codeFiles = files.filter(file => isCodeFile(file));
      
      if (codeFiles.length === 0) {
        vscode.window.showInformationMessage(`No code files found in folder: ${folderName}`);
        return;
      }

      progress.report({ message: `Found ${codeFiles.length} code files to process` });

      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const file of codeFiles) {
        try {
          const filename = path.basename(file);
          progress.report({ 
            message: `Processing ${filename} (${processedCount + 1}/${codeFiles.length})` 
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

      progress.report({ message: 'Folder documentation generation completed!' });
      
      // Show final results
      const message = `Finished Processing: ${folderName}\n❌ Errors: ${errorCount}\n✅ Success: ${successCount}`;
      vscode.window.showInformationMessage(message);
      
      // Reload the current document if it was processed
      if (codeFiles.includes(currentFilePath)) {
        await document.save();
      }
    });

  } catch (error) {
    console.error('Error generating headers for current folder:', error);
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clears AI-generated header from a single file
 * @param filePath The path to the file to clear
 * @returns Promise<boolean> True if successful, false otherwise
 */
async function clearAIHeaderFromFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    // Check if file has AI-generated header
    if (!hasHeaderComment(content, filename)) {
      console.log(`File ${filename} doesn't have an AI-generated header, skipping...`);
      return true;
    }

    // Remove AI header by finding the NeuroDoc identifier and removing the entire comment block
    const lines = content.split('\n');
    let neuroDocLineIndex = -1;
    
    // Find the line containing the NeuroDoc identifier
    for (let i = 0; i < Math.min(50, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes(AI_HEADER_IDENTIFIER)) {
        neuroDocLineIndex = i;
        break;
      }
    }
    
    if (neuroDocLineIndex >= 0) {
      // Now work backwards from the NeuroDoc line to find the actual start of the comment block
      let commentStartIndex = 0;
      
      // Look backwards from NeuroDoc line to find where the comment block actually starts
      for (let i = neuroDocLineIndex; i >= 0; i--) {
        const line = lines[i].trim();
        // If we find the start of a multi-line comment or any comment-related line, keep going back
        if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('//') || 
            line.includes('PURPOSE:') || line.includes('EXAMPLE:') || line.includes('RELATED CLASSES:') ||
            line === '' || line.includes('=====')) {
          commentStartIndex = i;
        } else {
          // If we hit a non-comment, non-empty line that's not part of the header, stop
          break;
        }
      }
      
      // Find where the actual code starts after the NeuroDoc line
      let startOfCodeIndex = neuroDocLineIndex + 1;
      
      // Skip any empty lines, closing comment markers, or remaining comment fragments
      while (startOfCodeIndex < lines.length) {
        const line = lines[startOfCodeIndex].trim();
        if (line === '' || line === '*/' || line.startsWith('//') || line.startsWith('*')) {
          startOfCodeIndex++;
        } else {
          break;
        }
      }
      
      // Create new content starting from the first actual code line
      const newLines = lines.slice(startOfCodeIndex);
      const newContent = newLines.join('\n');
      
      await fs.promises.writeFile(filePath, newContent, 'utf-8');
      console.log(`Successfully removed AI header from ${filename} (removed lines ${commentStartIndex} to ${startOfCodeIndex - 1})`);
      return true;
    } else {
      console.log(`Could not locate NeuroDoc identifier in ${filename}`);
      return false;
    }

  } catch (error) {
    console.error(`Error clearing AI header from file ${filePath}:`, error);
    return false;
  }
}

/**
 * Command to clear AI documentation from the entire workspace
 */
export async function clearAIDocumentationWorkspace(): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a workspace first.');
      return;
    }

    const result = await vscode.window.showWarningMessage(
      'This will remove all AI-generated headers from the entire workspace. This action cannot be undone. Continue?',
      'Yes', 'No'
    );
    
    if (result !== 'Yes') {
      return;
    }

    const workspaceFolder = workspaceFolders[0];
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: "Clearing AI Documentation from Workspace...",
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

          const result = await clearAIHeaderFromFile(file);
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

      progress.report({ message: 'Workspace AI documentation clearing completed!' });
      
      // Show final results
      const message = `AI Documentation cleared from workspace!\n❌ Errors: ${errorCount}\n✅ Success: ${successCount}`;
      vscode.window.showInformationMessage(message);
    });

  } catch (error) {
    console.error('Error clearing AI documentation from workspace:', error);
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Command to clear AI documentation from the currently open file
 */
export async function clearAIDocumentationCurrentFile(): Promise<void> {
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

    // Check if file has AI-generated header
    const content = document.getText();
    if (!hasHeaderComment(content, filename)) {
      vscode.window.showInformationMessage(`File ${filename} doesn't have an AI-generated header to remove.`);
      return;
    }

    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: `Clearing AI Header from ${filename}...`,
      cancellable: false
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      progress.report({ message: 'Removing AI-generated header...' });
      
      const result = await clearAIHeaderFromFile(filePath);
      
      if (result) {
        // Reload the document to show the changes
        await document.save();
        vscode.window.showInformationMessage(`✅ AI header removed successfully from ${filename}`);
      } else {
        vscode.window.showErrorMessage(`❌ Failed to remove AI header from ${filename}`);
      }
    });

  } catch (error) {
    console.error('Error clearing header from current file:', error);
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Command to clear AI documentation from all files in the current file's folder
 */
export async function clearAIDocumentationCurrentFolder(): Promise<void> {
  try {
    const activeEditor = vscode.window.activeTextEditor;
    
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active text editor found. Please open a code file first.');
      return;
    }

    const document = activeEditor.document;
    const currentFilePath = document.fileName;
    const currentFolder = path.dirname(currentFilePath);
    const folderName = path.basename(currentFolder);
    
    const result = await vscode.window.showWarningMessage(
      `This will remove all AI-generated headers from folder: ${folderName}. This action cannot be undone. Continue?`,
      'Yes', 'No'
    );
    
    if (result !== 'Yes') {
      return;
    }

    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: `Clearing AI Headers from folder: ${folderName}...`,
      cancellable: false
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      progress.report({ message: 'Scanning folder for code files...' });
      
      // Get all files in the current folder (non-recursive)
      let files: string[] = [];
      try {
        const items = await fs.promises.readdir(currentFolder);
        
        const fileStats = await Promise.all(
          items.map(async (item) => {
            const filePath = path.join(currentFolder, item);
            try {
              const stat = await fs.promises.stat(filePath);
              return { path: filePath, isFile: stat.isFile() };
            } catch {
              return { path: filePath, isFile: false };
            }
          })
        );
        
        files = fileStats
          .filter(({ isFile }) => isFile)
          .map(({ path }) => path);
        
      } catch (error) {
        vscode.window.showErrorMessage(`Error reading folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Filter for code files only
      const codeFiles = files.filter(file => isCodeFile(file));
      
      if (codeFiles.length === 0) {
        vscode.window.showInformationMessage(`No code files found in folder: ${folderName}`);
        return;
      }

      progress.report({ message: `Found ${codeFiles.length} code files to process` });

      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const file of codeFiles) {
        try {
          const filename = path.basename(file);
          progress.report({ 
            message: `Processing ${filename} (${processedCount + 1}/${codeFiles.length})` 
          });

          const result = await clearAIHeaderFromFile(file);
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

      progress.report({ message: 'Folder AI documentation clearing completed!' });
      
      // Show final results
      const message = `AI Headers cleared from folder: ${folderName}\n❌ Errors: ${errorCount}\n✅ Success: ${successCount}`;
      vscode.window.showInformationMessage(message);
      
      // Reload the current document if it was processed
      if (codeFiles.includes(currentFilePath)) {
        await document.save();
      }
    });

  } catch (error) {
    console.error('Error clearing headers from current folder:', error);
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
