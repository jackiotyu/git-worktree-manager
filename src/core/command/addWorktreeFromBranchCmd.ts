import * as vscode from "vscode";
import { WorktreeItem } from '@/core/treeView/items';
import { createWorktreeFromInfo } from '@/core/command/createWorktreeFromInfo';
import { getMainFolder } from '@/core/git/getMainFolder';
import folderRoot from "@/core/folderRoot";

export const addWorktreeFromBranchCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: vscode.l10n.t('Select the folder'),
        title: vscode.l10n.t('Select the folder where you want to create the worktree?'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    const mainFolder = await getMainFolder(item.path);
    return createWorktreeFromInfo({
        name: item.name,
        label: '分支',
        folderPath,
        isBranch: !!item.isBranch,
        cwd: mainFolder,
    });
};
