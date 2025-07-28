import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';
import { exec } from 'child_process';
import { promisify } from 'util';
import { withResolvers } from '@/core/util/promise';
import { actionProgressWrapper } from '@/core/ui/progress';
import logger from '@/core/log/logger';

interface IPostCreateWorktreeInfo {
    worktreePath: string;
    basePath: string;
}
export async function postCreateWorktree(info: IPostCreateWorktreeInfo) {
    const { worktreePath, basePath } = info;
    const postCreateCmd = Config.get('postCreateCmd', '');

    if (!postCreateCmd) return;

    const waiting = withResolvers<void>();
    const abortController = new AbortController();
    const tokenSource = new vscode.CancellationTokenSource();
    // Setup cancellation handling
    const disposeAbortSignal = tokenSource.token.onCancellationRequested(() => {
        waiting.resolve();
        abortController.abort();
    });

    try {
        const cmdStr = postCreateCmd.replace('$BASE_PATH', basePath).replace('$WORKTREE_PATH', worktreePath);

        actionProgressWrapper(
            vscode.l10n.t('Running post-create command...'),
            () => waiting.promise,
            () => {},
            tokenSource,
        );

        const execPromise = promisify(exec);

        const execChild = execPromise(cmdStr, {
            cwd: worktreePath, // 默认工作目录是 worktree 目录
            env: process.env,
            signal: abortController.signal,
            encoding: 'buffer',
        });
        execChild.child.stdout?.on('data', (data) => {
            logger.log(`[postCreateWorktree] ${data.toString()}`);
        });
        execChild.child.stderr?.on('data', (data) => {
            logger.error(`[postCreateWorktree] ${data.toString()}`);
        });

        await execChild;
        waiting.resolve();
        logger.log(`[postCreateWorktree] done`);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            // Ignore abort errors
            return;
        }
        logger.error(`[postCreateWorktree] ${error}`);
    } finally {
        disposeAbortSignal.dispose();
        tokenSource.dispose();
        waiting.resolve();
    }
}
