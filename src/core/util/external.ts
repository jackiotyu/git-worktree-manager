import * as vscode from 'vscode';
import open from 'open';

export const openExternalTerminal = (path: string) => {
    return vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(path));
};

export const revealFolderInOS = (folder: string) => {
    open(folder);
};