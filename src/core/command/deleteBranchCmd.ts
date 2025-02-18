import * as vscode from 'vscode';
import { deleteBranch } from '@/core/git/deleteBranch';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { BranchForWorktree } from '@/types';

export const deleteBranchCmd = async (item: BranchForWorktree) => {
    console.log('deleteBranchCmd', item);
    if(!item.mainFolder || !item.branch) return;
    try {
        const confirm = await confirmModal(
            vscode.l10n.t('Delete branch'),
            vscode.l10n.t('The branch {0} based on {1} will be deleted', item.branch, item.mainFolder),
        );
        if(!confirm) return;
        await deleteBranch(item.mainFolder, item.branch);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to delete branch ( {0} ), {1}', item.branch, String(error)));
        logger.error(error);
    }
};