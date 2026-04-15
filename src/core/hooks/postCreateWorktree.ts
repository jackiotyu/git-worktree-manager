import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';
import { runWorktreeHookCommand } from '@/core/hooks/runWorktreeHookCommand';
import logger from '@/core/log/logger';

interface IPostCreateWorktreeInfo {
    worktreePath: string;
    basePath: string;
}

export async function postCreateWorktree(info: IPostCreateWorktreeInfo): Promise<void> {
    const { worktreePath, basePath } = info;
    const postCreateCmd = Config.get('postCreateCmd', '');

    if (!postCreateCmd) {
        return;
    }

    const cmdStr = postCreateCmd.replace('$BASE_PATH', basePath).replace('$WORKTREE_PATH', worktreePath);

    await runWorktreeHookCommand({
        cmdStr,
        worktreePath,
        progressTitle: vscode.l10n.t('Running post-create command...'),
        logTag: 'postCreateWorktree',
        onExecError: (error: unknown) => {
            const err = error as { name?: string };
            if (err.name === 'AbortError') {
                return;
            }
            logger.error(`[postCreateWorktree] ${error}`);
        },
    });
}
