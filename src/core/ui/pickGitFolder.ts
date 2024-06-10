import * as vscode from 'vscode';
import { WorkspaceState } from '@/core/state';
import path from 'path';

export const pickGitFolder = async (): Promise<string | undefined | null> => {
    const mainFolders = WorkspaceState.get('mainFolders', []).map((i) => i.path);
    if (mainFolders.length === 0) return null;
    if (mainFolders.length > 1) {
        const items: vscode.QuickPickItem[] = [
            ...mainFolders.map<vscode.QuickPickItem>((folderPath) => {
                return {
                    label: path.basename(folderPath),
                    description: folderPath,
                    iconPath: new vscode.ThemeIcon('repo'),
                };
            }),
        ];
        const folderPath = await vscode.window.showQuickPick(items, {
            title: vscode.l10n.t('Select git repository for create worktree'),
            canPickMany: false,
        });
        return folderPath?.description;
    } else {
        return mainFolders[0];
    }
};