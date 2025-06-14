import * as vscode from 'vscode';
import { pruneWorktree } from '@/core/git/pruneWorktree';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { pickGitFolder } from '@/core/ui/pickGitFolder';

export const pruneWorktreeCmd = async () => {
    try {
        const repoPath = await pickGitFolder(vscode.l10n.t('Select git repository for prune worktree')) || '';
        let output = await pruneWorktree(true, repoPath);
        if (!output?.length) {
            return;
        }
        let ok = vscode.l10n.t('ok');
        let confirm = await vscode.window.showInformationMessage(
            vscode.l10n.t('The following worktree folders will be pruned'),
            {
                detail: output.join('  \n'),
                modal: true,
            },
            ok,
        );
        if (confirm !== ok) {
            return;
        }
        await pruneWorktree(false, repoPath);
        Alert.showInformationMessage(vscode.l10n.t('Prune worktree succeeded'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to prune worktree'));
        logger.error(error);
    }
};
