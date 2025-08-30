import * as vscode from 'vscode';
import * as path from 'path';
import { getAllFiles, isCodeFile, hasHeaderComment } from './utils';
import { processFileWithAI } from './fileProcessor';

/**
 * Command to process the entire workspace with AI documentation
 */
export async function callAIDocumentorCommand(): Promise<void> {
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
 * Command to generate header for the currently open file
 */
export async function generateHeaderForCurrentFileCommand(): Promise<void> {
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
