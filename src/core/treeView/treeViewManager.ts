import * as vscode from 'vscode';
import { GitFoldersDataProvider, RecentFoldersDataProvider, WorktreeDataProvider, SettingDataProvider } from '@/core/treeView/views';
import { TreeItemKind } from '@/constants';
import { revealTreeItemEvent } from '@/core/event/events';
import { GitFolderItem, WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';

export class TreeViewManager {
    private static worktreeData?: WorktreeDataProvider;
    private static gitFolderData?: GitFoldersDataProvider;

    static register (context: vscode.ExtensionContext) {
        const settingView = vscode.window.createTreeView(SettingDataProvider.id, {
            treeDataProvider: new SettingDataProvider(),
        });
        this.worktreeData = new WorktreeDataProvider(context);
        const worktreeView = vscode.window.createTreeView(WorktreeDataProvider.id, {
            treeDataProvider: this.worktreeData,
            showCollapseAll: false,
        });
        this.gitFolderData = new GitFoldersDataProvider(context);
        const gitFolderView = vscode.window.createTreeView(GitFoldersDataProvider.id, {
            treeDataProvider: this.gitFolderData,
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
            settingView,
            worktreeView,
            gitFolderView,
            recentFolderView,
        );
    }

    static refreshWorktreeView(item: WorktreeItem) {
        return this.worktreeData?.update(item);
    }

    static refreshGitFolderView(item: GitFolderItem | WorktreeItem) {
        return this.gitFolderData?.update(item);
    }
}
