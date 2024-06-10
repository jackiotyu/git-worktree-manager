import * as vscode from 'vscode';
import { WorkTreeItem } from '@/core/treeView/items';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';

export const switchToSelectFolderCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.path), {
            forceNewWindow: false,
            forceReuseWindow: true,
        });
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Switching worktree failed \n\n {0}', String(error)));
        logger.error(error);
    }
};