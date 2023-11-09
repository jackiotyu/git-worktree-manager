import * as vscode from 'vscode';
import { Commands } from '@/constants';

export class StatusBarItemManager {
    static register(context: vscode.ExtensionContext) {
        let searchWorktreeItem = vscode.window.createStatusBarItem(
            'git-worktree-manager.searchAllWorktree',
            vscode.StatusBarAlignment.Left,
            1,
        );
        searchWorktreeItem.command = Commands.searchAllWorktree;
        searchWorktreeItem.text = `$(root-folder)`;
        searchWorktreeItem.tooltip = vscode.l10n.t('Find Worktree');
        searchWorktreeItem.show();
        searchWorktreeItem.name = 'search worktree';

        context.subscriptions.push(searchWorktreeItem);
    }
}
