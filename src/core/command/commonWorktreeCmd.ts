import * as vscode from 'vscode';
import { Commands } from '@/constants';
import { lockWorktree } from '@/core/git/lockWorktree';
import { unlockWorktree } from '@/core/git/unlockWorktree';
import { repairWorktree } from '@/core/git/repairWorktree';
import { Alert } from '@/core/ui/message';
import * as util from 'util';
import logger from '@/core/log/logger';

export const commonWorktreeCmd = async (path: string, cmd: Commands, cwd?: string) => {
    let cmdName = vscode.l10n.t('operation');
    try {
        switch (cmd) {
            case Commands.lockWorktree:
                await lockWorktree(path, cwd);
                cmdName = vscode.l10n.t('Lock');
                break;
            case Commands.unlockWorktree:
                await unlockWorktree(path, cwd);
                cmdName = vscode.l10n.t('Unlock');
                break;
            case Commands.repairWorktree:
                await repairWorktree(path, cwd);
                cmdName = vscode.l10n.t('Repair');
                break;
        }
        Alert.showInformationMessage(vscode.l10n.t('Worktree {0} completed successfully', cmdName));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree {0} failed: {1}', cmdName, util.inspect(error, false, 1, true)));
        logger.error(error);
    }
};
