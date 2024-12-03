import * as vscode from 'vscode';
import { GitFoldersDataProvider, RecentFoldersDataProvider, WorktreeDataProvider, SettingDataProvider } from '@/core/treeView/views';
import { TreeItemKind } from '@/constants';
import { revealTreeItemEvent } from '@/core/event/events';

export class TreeViewManager {
    static register (context: vscode.ExtensionContext) {
        vscode.window.registerTreeDataProvider(SettingDataProvider.id, new SettingDataProvider());
        const worktreeView = vscode.window.createTreeView(WorktreeDataProvider.id, {
            treeDataProvider: new WorktreeDataProvider(context),
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
        );
    }
}
