import * as vscode from 'vscode';
import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { removeWorktree } from '@/core/git/removeWorktree';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';

export const removeWorktreeCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    try {
        const confirm = await confirmModal(
            vscode.l10n.t('Delete worktree'),
            vscode.l10n.t('The worktree for the {0} folder will be deleted', item.path),
        );
        if (!confirm) {
            return;
        }
        await removeWorktree(item.path, item.parent?.path);
        Alert.showInformationMessage(vscode.l10n.t('Successfully deleted the worktree for the {0} folder', item.path));
        vscode.commands.executeCommand(Commands.refreshWorktree);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};