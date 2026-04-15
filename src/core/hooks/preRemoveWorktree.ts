import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';
import { runWorktreeHookCommand } from '@/core/hooks/runWorktreeHookCommand';
import logger from '@/core/log/logger';

interface IPreRemoveWorktreeInfo {
    worktreePath: string;
    basePath: string;
}

/**
 * Runs the user-configured `preRemoveCmd` inside the worktree directory
 * before it is removed. Throws on failure so the caller can abort removal.
 */
export async function preRemoveWorktree(info: IPreRemoveWorktreeInfo): Promise<void> {
    const { worktreePath, basePath } = info;
    const preRemoveCmd = Config.get('preRemoveCmd', '');

    if (!preRemoveCmd) {
        return;
    }

    const cmdStr = preRemoveCmd.replace('$BASE_PATH', basePath).replace('$WORKTREE_PATH', worktreePath);

    await runWorktreeHookCommand({
        cmdStr,
        worktreePath,
        progressTitle: vscode.l10n.t('Running pre-remove command...'),
        logTag: 'preRemoveWorktree',
        onExecError: (error: unknown) => {
            const err = error as { name?: string; message?: string };
            logger.error(`[preRemoveWorktree] ${error}`);
            if (err.name === 'AbortError') {
                throw new Error(vscode.l10n.t('Pre-remove command was cancelled'));
            }
            throw new Error(vscode.l10n.t('Pre-remove command failed: {0}', err.message ?? String(error)));
        },
    });
}
