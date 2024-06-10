import * as vscode from 'vscode';
import { Commands } from '@/constants';
import { lockWorkTree } from '@/core/git/lockWorkTree';
import { unlockWorkTree } from '@/core/git/unlockWorkTree';
import { repairWorkTree } from '@/core/git/repairWorkTree';
import { Alert } from '@/core/ui/message';
import * as util from 'util';
import logger from '@/core/log/logger';

export const commonWorkTreeCmd = async (path: string, cmd: Commands, cwd?: string) => {
    let cmdName = vscode.l10n.t('operation');
    try {
        switch (cmd) {
            case Commands.lockWorkTree:
                await lockWorkTree(path, cwd);
                cmdName = vscode.l10n.t('lock');
                break;
            case Commands.unlockWorkTree:
                await unlockWorkTree(path, cwd);
                cmdName = vscode.l10n.t('unlock');
                break;
            case Commands.repairWorkTree:
                await repairWorkTree(path, cwd);
                cmdName = vscode.l10n.t('repair');
                break;
        }
        Alert.showInformationMessage(vscode.l10n.t('Worktree {0} successfully', cmdName));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree {0} failed {1}', cmdName, util.inspect(error, false, 1, true)));
        logger.error(error);
    }
};