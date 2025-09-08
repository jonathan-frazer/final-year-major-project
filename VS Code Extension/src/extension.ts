import * as vscode from 'vscode';
import { 
  generateAIDocumentationWorkspace, 
  generateAIDocumentationCurrentFile, 
  generateAIDocumentationCurrentFolder,
  clearAIDocumentationWorkspace,
  clearAIDocumentationCurrentFile,
  clearAIDocumentationCurrentFolder,
  syncGraphDatabase,
  runGraphRagCommand
} from './commands';

export function activate(context: vscode.ExtensionContext) 
{
  console.log('NeuroDoc extension is now active!');

  // Generate AI Documentation Commands
  let generateWorkspaceCommand = vscode.commands.registerCommand('aiHeaderCommenter.generateAIDocumentationWorkspace', generateAIDocumentationWorkspace);
  let generateCurrentFileCommand = vscode.commands.registerCommand('aiHeaderCommenter.generateAIDocumentationCurrentFile', generateAIDocumentationCurrentFile);
  let generateCurrentFolderCommand = vscode.commands.registerCommand('aiHeaderCommenter.generateAIDocumentationCurrentFolder', generateAIDocumentationCurrentFolder);

  // Clear AI Documentation Commands
  let clearWorkspaceCommand = vscode.commands.registerCommand('aiHeaderCommenter.clearAIDocumentationWorkspace', clearAIDocumentationWorkspace);
  let clearCurrentFileCommand = vscode.commands.registerCommand('aiHeaderCommenter.clearAIDocumentationCurrentFile', clearAIDocumentationCurrentFile);
  let clearCurrentFolderCommand = vscode.commands.registerCommand('aiHeaderCommenter.clearAIDocumentationCurrentFolder', clearAIDocumentationCurrentFolder);
  
  // Sync Graph Commands
  let syncGraphCommand = vscode.commands.registerCommand('aiHeaderCommenter.syncGraph', syncGraphDatabase);
  let runGraphCommand = vscode.commands.registerCommand('aiHeaderCommenter.runGraphRag', runGraphRagCommand);
  
  context.subscriptions.push(
    generateWorkspaceCommand, 
    generateCurrentFileCommand, 
    generateCurrentFolderCommand,
    clearWorkspaceCommand,
    clearCurrentFileCommand,
    clearCurrentFolderCommand,
    syncGraphCommand,
    runGraphCommand
  );
}



export function deactivate() {}
