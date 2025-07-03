import * as vscode from 'vscode';
import { open }  from '@/core/util/open';

export const openExternalTerminal = (path: string) => {
    return vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(path));
};

export const revealFolderInOS = (folder: string) => {
    // vscode.env.openExternal(vscode.Uri.file(folder)); // open 'vscode' folder error
    return open(folder);
};