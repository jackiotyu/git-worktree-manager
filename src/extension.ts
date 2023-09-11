import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent, updateRecentEvent } from '@/lib/events';
import { WorkTreeDataProvider, GitFoldersDataProvider, RecentFoldersDataProvider } from '@/lib/treeView';
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
    const worktreeView = vscode.window.createTreeView(WorkTreeDataProvider.id, {
        treeDataProvider: new WorkTreeDataProvider(context),
        showCollapseAll: false,
    });
    const folderView = vscode.window.createTreeView(GitFoldersDataProvider.id, {
        treeDataProvider: new GitFoldersDataProvider(context),
        showCollapseAll: true,
    });
    const recentFolderView = vscode.window.createTreeView(RecentFoldersDataProvider.id, {
        treeDataProvider: new RecentFoldersDataProvider(context),
    });
    recentFolderView.onDidChangeVisibility(
        throttle(
            (event: vscode.TreeViewVisibilityChangeEvent) => {
                event.visible && updateRecentEvent.fire();
            },
            60,
            { leading: false, trailing: true },
        ),
    );
    setupGitEvents(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, worktreeView, folderView, recentFolderView, updateHandler);
}

export function deactivate() {}
