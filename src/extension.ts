import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent, updateRecentEvent } from '@/lib/events';
import { WorkTreeDataProvider, GitFoldersDataProvider, RecentFoldersDataProvider } from '@/lib/treeView';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
import { CommandsManger } from '@/lib/commands';
import { init } from 'vscode-nls-i18n';
import { setupGitEvents } from '@/lib/gitExtension';
import { GlobalState } from '@/lib/globalState';
import { Alert } from '@/lib/adaptor/window';
// import { StatusBarItemManager } from '@/lib/statusBarItem';
import throttle from 'lodash/throttle';

export function activate(context: vscode.ExtensionContext) {
    console.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    init(context.extensionPath);
    Alert.init(context);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    // StatusBarItemManager.register(context);
    const updateHandler = updateTreeDataEvent.event(
        throttle(async () => treeDataEvent.fire((await getWorkTreeList())), 300, { trailing: true, leading: true }),
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
    setupGitEvents(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, worktreeView, folderView, recentFolderView, updateHandler);
}

export function deactivate() {}
