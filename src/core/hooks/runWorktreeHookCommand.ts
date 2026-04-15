import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { withResolvers } from '@/core/util/promise';
import { actionProgressWrapper } from '@/core/ui/progress';
import logger from '@/core/log/logger';

export interface RunWorktreeHookCommandParams {
    /** Final shell command after the caller substituted placeholders. */
    cmdStr: string;
    worktreePath: string;
    progressTitle: string;
    logTag: string;
    /** Invoked when `exec` fails or the child errors; caller may swallow or throw. */
    onExecError: (error: unknown) => void;
}

/**
 * Runs a user-configured worktree hook command (shared by post-create and pre-remove).
 * Cancellation and `finally` ordering match legacy behavior; runtime errors go through `onExecError`.
 */
export async function runWorktreeHookCommand(params: RunWorktreeHookCommandParams): Promise<void> {
    const { cmdStr, worktreePath, progressTitle, logTag, onExecError } = params;

    const waiting = withResolvers<void>();
    const abortController = new AbortController();
    const tokenSource = new vscode.CancellationTokenSource();

    const disposeAbortSignal = tokenSource.token.onCancellationRequested(() => {
        abortController.abort();
    });

    try {
        actionProgressWrapper(
            progressTitle,
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
            logger.log(`[${logTag}] ${data.toString()}`);
        });
        execChild.child.stderr?.on('data', (data) => {
            logger.error(`[${logTag}] ${data.toString()}`);
        });

        await execChild;
        logger.log(`[${logTag}] done`);
    } catch (error: unknown) {
        onExecError(error);
    } finally {
        disposeAbortSignal.dispose();
        tokenSource.dispose();
        waiting.resolve();
    }
}
