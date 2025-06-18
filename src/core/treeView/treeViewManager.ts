import * as vscode from 'vscode';
import {
    GitFoldersDataProvider,
    RecentFoldersDataProvider,
    WorktreeDataProvider,
    SettingDataProvider,
    FavoriteDataProvider,
} from '@/core/treeView/views';
import { TreeItemKind, ViewId } from '@/constants';
import { revealTreeItemEvent } from '@/core/event/events';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import { Config } from '@/core/config/setting';

export class TreeViewManager {
    private static worktreeData?: WorktreeDataProvider;
    private static gitFolderData?: GitFoldersDataProvider;

    static register(context: vscode.ExtensionContext) {
        const settingView = vscode.window.createTreeView(SettingDataProvider.id, {
            treeDataProvider: new SettingDataProvider(),
        });

        this.worktreeData = new WorktreeDataProvider(context);
        const worktreeView = vscode.window.createTreeView(ViewId.worktreeList, {
            treeDataProvider: this.worktreeData,
            showCollapseAll: false,
        });
        const worktreeViewSCM = vscode.window.createTreeView(ViewId.worktreeListSCM, {
            treeDataProvider: this.worktreeData,
            showCollapseAll: false,
        });

        this.gitFolderData = new GitFoldersDataProvider(context);
        const gitFolderView = vscode.window.createTreeView(ViewId.gitFolderList, {
            treeDataProvider: this.gitFolderData,
            showCollapseAll: true,
        });
        const gitFolderViewSCM = vscode.window.createTreeView(ViewId.gitFolderListSCM, {
            treeDataProvider: this.gitFolderData,
            showCollapseAll: true,
        });

        const recentFolderView = vscode.window.createTreeView(RecentFoldersDataProvider.id, {
            treeDataProvider: new RecentFoldersDataProvider(context),
        });

        const favoriteView = vscode.window.createTreeView(FavoriteDataProvider.id, {
            treeDataProvider: new FavoriteDataProvider(context),
        });

        // FIXME 需要选中treeItem才能保证`revealFileInOS`和`openInTerminal`成功执行
        revealTreeItemEvent.event((item) => {
            const viewsToSCM = Config.get('treeView.toSCM', false);
            const _gitFolderView = viewsToSCM ? gitFolderViewSCM : gitFolderView;
            const _worktreeView = viewsToSCM ? worktreeViewSCM : worktreeView;

            if (item.type === TreeItemKind.folder) {
                if (item.from === ViewId.favorite) favoriteView.reveal(item, { focus: true, select: true });
                if (item.from === ViewId.folderList) recentFolderView.reveal(item, { focus: true, select: true });
                return;
            }

            if (item.type === TreeItemKind.gitFolder) {
                return _gitFolderView.reveal(item, { focus: true, select: true });
            }

            if (item.type === TreeItemKind.worktree) {
                if (item.parent?.type === TreeItemKind.gitFolder) {
                    return _gitFolderView.reveal(item, { focus: true, select: true });
                }
                return _worktreeView.reveal(item, { focus: true, select: true });
            }
        });
        context.subscriptions.push(
            settingView,
            worktreeView,
            gitFolderView,
            recentFolderView,
            worktreeViewSCM,
            gitFolderViewSCM,
            favoriteView,
        );
    }

    static updateWorktreeView(item: WorktreeItem) {
        return this.worktreeData?.update(item);
    }

    static updateGitFolderView(item: GitFolderItem | WorktreeItem) {
        return this.gitFolderData?.update(item);
    }
}
