import * as vscode from 'vscode';

export function openSettingCmd() {
    void vscode.commands.executeCommand('workbench.action.openSettings', `@ext:jackiotyu.git-worktree-manager`);
}