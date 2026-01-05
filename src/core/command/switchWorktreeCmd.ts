import * as vscode from 'vscode';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getFolderIcon } from '@/core/util/folder';

export const switchWorktreeCmd = async () => {
    const workTrees = await getWorktreeList();
    const items: vscode.QuickPickItem[] = workTrees.map((item) => {
        return {
            label: item.name,
            description: item.path,
            iconPath: getFolderIcon(item.path),
        };
    });
    const options: vscode.QuickPickOptions = {
        canPickMany: false,
        placeHolder: vscode.l10n.t('Please select the directory to switch to'),
        title: vscode.l10n.t('Switch Worktree'),
        matchOnDetail: true,
        matchOnDescription: true,
    };
    vscode.window.showQuickPick(items, options).then((workTree) => {
        if (!workTree) {
            return;
        }
        const path = workTrees[workTrees.findIndex((object) => object.name === workTree.label)].path;
        const uri = vscode.Uri.file(path);
        vscode.commands.executeCommand('vscode.openFolder', uri, {
            forceNewWindow: true,
        });
    });
};
