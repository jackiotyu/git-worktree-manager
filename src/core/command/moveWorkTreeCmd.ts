import * as vscode from 'vscode';
import { WorkTreeItem } from '@/core/treeView/items';
import { moveWorkTree } from '@/core/git/moveWorkTree';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import path from 'path';

export const moveWorkTreeCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        let uriList = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(path.dirname(item.path)),
            openLabel: vscode.l10n.t('Select the folder'),
            title: vscode.l10n.t(`Select the new location to move the Worktree's folder from {0}`, item.path),
        });
        if (!uriList?.length) {
            return;
        }
        let folderUri = uriList[0];
        await moveWorkTree(item.path, folderUri.fsPath, item.parent?.path);
        Alert.showInformationMessage(vscode.l10n.t('Worktree moved successfully'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree move failed \n\n {0}', String(error)));
        logger.error(error);
    }
};