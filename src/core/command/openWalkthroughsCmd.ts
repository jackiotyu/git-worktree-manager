import * as vscode from "vscode";

export const openWalkthroughsCmd = () => {
    vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'jackiotyu.git-worktree-manager#git-worktree-usage',
        false,
    );
};