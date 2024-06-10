import * as vscode from "vscode";

export const openRecentCmd = () => {
    vscode.commands.executeCommand('workbench.action.openRecent');
};