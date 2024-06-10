import * as vscode from "vscode";
import { WorkTreeItem } from '@/core/treeView/items';
import { createWorkTreeFromInfo } from '@/core/command/createWorkTreeFromInfo';
import folderRoot from "@/core/folderRoot";

export const addWorkTreeFromBranchCmd = async (item?: WorkTreeItem) => {
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
    return createWorkTreeFromInfo({
        name: item.name,
        label: '分支',
        folderPath,
        isBranch: !!item.isBranch,
    });
};
