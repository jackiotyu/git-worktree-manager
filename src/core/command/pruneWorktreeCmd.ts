import * as vscode from 'vscode';
import { pruneWorktree } from '@/core/git/pruneWorktree';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';

export const pruneWorktreeCmd = async () => {
    try {
        let output = await pruneWorktree(true);
        if (!output?.length) {
            return;
        }
        let ok = vscode.l10n.t('ok');
        let confirm = await Alert.showInformationMessage(
            vscode.l10n.t('The following Worktree folder will be deleted'),
            {
                detail: output.join('  \n'),
                modal: true,
            },
            ok,
        );
        if (confirm !== ok) {
            return;
        }
        await pruneWorktree();
        Alert.showInformationMessage(vscode.l10n.t('Prune worktree succeeded'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to prune worktree'));
        logger.error(error);
    }
};