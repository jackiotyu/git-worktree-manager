import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/lib/events';
import { WorkTreeDataProvider, GitFoldersDataProvider } from '@/lib/treeView';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
import { CommandsManger } from '@/lib/commands';
import { init } from 'vscode-nls-i18n';
import { setupGitEvents } from '@/lib/gitExtension';
import { GlobalState } from '@/lib/globalState';
import throttle from 'lodash/throttle';

export function activate(context: vscode.ExtensionContext) {
    console.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    init(context.extensionPath);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    const updateHandler = updateTreeDataEvent.event(
        throttle(() => treeDataEvent.fire(getWorkTreeList()), 300, { trailing: true, leading: true }),
    );
    CommandsManger.register(context);
    const worktreeView = vscode.window.createTreeView('git-worktree-manager-list', {
        treeDataProvider: new WorkTreeDataProvider(context),
        showCollapseAll: false,
    });
    const folderView = vscode.window.createTreeView('git-worktree-manager-folders', {
        treeDataProvider: new GitFoldersDataProvider(context),
        showCollapseAll: true,
    });
    setupGitEvents(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, worktreeView, folderView, updateHandler);
}

export function deactivate() {}
