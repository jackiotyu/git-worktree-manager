import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';
import { exec } from 'child_process';
import { promisify } from 'util';
import { withResolvers } from '@/core/util/promise';
import { actionProgressWrapper } from '@/core/ui/progress';
import logger from '@/core/log/logger';

interface IPreRemoveWorktreeInfo {
    worktreePath: string;
    basePath: string;
}

/**
 * Runs the user-configured `preRemoveCmd` inside the worktree directory
 * before it is removed. Throws on failure so the caller can abort removal.
 */
export async function preRemoveWorktree(info: IPreRemoveWorktreeInfo) {
    const { worktreePath, basePath } = info;
    const preRemoveCmd = Config.get('preRemoveCmd', '');

    if (!preRemoveCmd) return;

    const waiting = withResolvers<void>();
    const abortController = new AbortController();
    const tokenSource = new vscode.CancellationTokenSource();
    const disposeAbortSignal = tokenSource.token.onCancellationRequested(() => {
        abortController.abort();
    });

    try {
        const cmdStr = preRemoveCmd.replace('$BASE_PATH', basePath).replace('$WORKTREE_PATH', worktreePath);

        actionProgressWrapper(
            vscode.l10n.t('Running pre-remove command...'),
            () => waiting.promise,
            () => {},
            tokenSource,
        );

        const execPromise = promisify(exec);

        const execChild = execPromise(cmdStr, {
            cwd: worktreePath,
            env: process.env,
            signal: abortController.signal,
            encoding: 'buffer',
        });
        execChild.child.stdout?.on('data', (data) => {
            logger.log(`[preRemoveWorktree] ${data.toString()}`);
        });
        execChild.child.stderr?.on('data', (data) => {
            logger.error(`[preRemoveWorktree] ${data.toString()}`);
        });

        await execChild;
        logger.log(`[preRemoveWorktree] done`);
    } catch (error: any) {
        logger.error(`[preRemoveWorktree] ${error}`);
        if (error?.name === 'AbortError') {
            throw new Error(vscode.l10n.t('Pre-remove command was cancelled'));
        }
        throw new Error(vscode.l10n.t('Pre-remove command failed: {0}', error?.message ?? String(error)));
    } finally {
        waiting.resolve();
        disposeAbortSignal.dispose();
        tokenSource.dispose();
    }
}
