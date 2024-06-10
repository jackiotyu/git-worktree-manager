import * as vscode from 'vscode';
import { WorkTreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { removeWorkTree } from '@/core/git/removeWorkTree';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';

export const removeWorkTreeCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        const confirm = await confirmModal(
            vscode.l10n.t('Delete worktree'),
            vscode.l10n.t('The worktree for the {0} folder will be deleted', item.path),
        );
        if (!confirm) {
            return;
        }
        await removeWorkTree(item.path, item.parent?.path);
        Alert.showInformationMessage(vscode.l10n.t('Successfully deleted the worktree for the {0} folder', item.path));
        vscode.commands.executeCommand(Commands.refreshWorkTree);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};