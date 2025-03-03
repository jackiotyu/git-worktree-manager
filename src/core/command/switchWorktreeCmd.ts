import * as vscode from 'vscode';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getFolderIcon } from '@/core/util/folder';

export const switchWorktreeCmd = async () => {
    let workTrees = await getWorktreeList('', true);
    const items: vscode.QuickPickItem[] = workTrees.map((item) => {
        return {
            label: item.name,
            description: item.path,
            iconPath: getFolderIcon(item.path),
        };
    });
    const options: vscode.QuickPickOptions = {
        canPickMany: false,
        placeHolder: vscode.l10n.t('Please select the directory to switch'),
        title: vscode.l10n.t('Worktree switch'),
        matchOnDetail: true,
        matchOnDescription: true,
    };
    vscode.window.showQuickPick(items, options).then((workTree) => {
        if (!workTree) {
            return;
        }
        let path = workTrees[workTrees.findIndex((object) => object.name === workTree.label)].path;
        let uri = vscode.Uri.file(path);
        vscode.commands.executeCommand('vscode.openFolder', uri, {
            forceNewWindow: true,
        });
    });
};