import * as vscode from 'vscode';
import { pruneWorkTree } from '@/core/git/pruneWorkTree';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';

export const pruneWorkTreeCmd = async () => {
    try {
        let output = await pruneWorkTree(true);
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
        await pruneWorkTree();
        Alert.showInformationMessage(vscode.l10n.t('Prune worktree succeeded'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to prune worktree'));
        logger.error(error);
    }
};