import * as vscode from 'vscode';
import { callAIDocumentorCommand, generateHeaderForCurrentFileCommand } from './commands';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Header Commenter extension is now active!');

  // Command 1: Process entire workspace
  let workspaceCommand = vscode.commands.registerCommand('aiHeaderCommenter.callAIDocumentor', callAIDocumentorCommand);

  // Command 2: Process currently open file
  let currentFileCommand = vscode.commands.registerCommand('aiHeaderCommenter.generateHeaderForCurrentFile', generateHeaderForCurrentFileCommand);

  context.subscriptions.push(workspaceCommand, currentFileCommand);
}



export function deactivate() {}
