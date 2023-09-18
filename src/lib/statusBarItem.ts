import * as vscode from 'vscode';
import { Commands } from '@/constants';
import localize from '@/localize';

export class StatusBarItemManager {
    static register(context: vscode.ExtensionContext) {
        let searchWorktreeItem = vscode.window.createStatusBarItem(
            'git-worktree-manager.searchAllWorktree',
            vscode.StatusBarAlignment.Left,
            1,
        );
        searchWorktreeItem.command = Commands.searchAllWorktree;
        searchWorktreeItem.text = `$(root-folder)`; //localize('cmd.searchAllWorktree');
        searchWorktreeItem.tooltip = localize('cmd.searchAllWorktree');
        searchWorktreeItem.show();
        searchWorktreeItem.name = 'search worktree';

        context.subscriptions.push(searchWorktreeItem);
    }
}
