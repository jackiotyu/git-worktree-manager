import * as vscode from 'vscode';
import logger from '@/core/log/logger';
import { Commands } from '@/constants';
import { bootstrap } from '@/core/bootstrap';

export function activate(context: vscode.ExtensionContext) {
    logger.log('git-worktree-manager is now active!');
    bootstrap(context);
}

export function deactivate() {
    vscode.commands.executeCommand(Commands.unwatchWorktreeEvent);
}
