import * as vscode from 'vscode';
import { GitFoldersDataProvider, RecentFoldersDataProvider, WorkTreeDataProvider } from '@/lib/treeView';
import { TreeItemKind } from '@/constants';
import { revealTreeItemEvent, changeUIVisibleEvent } from '@/lib/events';

export class TreeViewManager {
    static register (context: vscode.ExtensionContext) {
        const worktreeView = vscode.window.createTreeView(WorkTreeDataProvider.id, {
            treeDataProvider: new WorkTreeDataProvider(context),
            showCollapseAll: false,
        });
        const gitFolderView = vscode.window.createTreeView(GitFoldersDataProvider.id, {
            treeDataProvider: new GitFoldersDataProvider(context),
            showCollapseAll: true,
        });
        const recentFolderView = vscode.window.createTreeView(RecentFoldersDataProvider.id, {
            treeDataProvider: new RecentFoldersDataProvider(context),
        });

        // FIXME 需要选中treeItem才能保证`revealFileInOS`和`openInTerminal`成功执行
        revealTreeItemEvent.event((item) => {
            switch (item.type) {
                case TreeItemKind.folder:
                    return recentFolderView.reveal(item, { focus: true, select: true });
                case TreeItemKind.gitFolder:
                    return gitFolderView.reveal(item, { focus: true, select: true });
                case TreeItemKind.worktree:
                    if (item.parent?.type === TreeItemKind.gitFolder) {
                        return gitFolderView.reveal(item, { focus: true, select: true });
                    }
                    return worktreeView.reveal(item, { focus: true, select: true });
            }
        });
        context.subscriptions.push(
            worktreeView,
            gitFolderView,
            recentFolderView,
            worktreeView.onDidChangeVisibility((event) => {
                changeUIVisibleEvent.fire({ type: TreeItemKind.worktree, visible: event.visible });
            }),
            gitFolderView.onDidChangeVisibility((event) => {
                changeUIVisibleEvent.fire({ type: TreeItemKind.gitFolder, visible: event.visible });
            }),
        );
    }
}
