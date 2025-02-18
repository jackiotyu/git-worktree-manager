import * as vscode from 'vscode';
// import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { removeWorktree } from '@/core/git/removeWorktree';
import { getCurrentBranch } from '@/core/git/getCurrentBranch';
import { getMainFolder } from '@/core/git/getMainFolder';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { IBranchForWorktree } from '@/types';

export const removeWorktreeCmd = async (item?: { path: string }) => {
    if (!item || !item.path) return;
    const worktreePath = item.path;
    try {
        const confirm = await confirmModal(
            vscode.l10n.t('Delete worktree'),
            vscode.l10n.t('The worktree for the {0} folder will be deleted', worktreePath),
        );
        if (!confirm) {
            return;
        }

        const [branchName, mainFolder] = await Promise.all([getCurrentBranch(worktreePath), getMainFolder(worktreePath)]).catch(() => ['', '']);

        await removeWorktree(worktreePath, worktreePath);
        Alert.showInformationMessage(vscode.l10n.t('Successfully deleted the worktree for the {0} folder', worktreePath));
        vscode.commands.executeCommand(Commands.refreshWorktree);

        // Delete the related branch
        if(!branchName) return;
        const branchInfo: IBranchForWorktree = { branch: branchName, mainFolder };
        await vscode.commands.executeCommand(Commands.deleteBranch, branchInfo);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};