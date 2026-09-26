import * as vscode from 'vscode';
import {
    GitFoldersDataProvider,
    RecentFoldersDataProvider,
    WorktreeDataProvider,
    SettingDataProvider,
    FavoriteDataProvider,
    FavoriteAndDropController,
} from '@/core/treeView/views';
import { TreeItemKind, ViewId } from '@/constants';
import { revealTreeItemEvent } from '@/core/event/events';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import { Config } from '@/core/config/setting';

export class TreeViewManager {
    private static worktreeData?: WorktreeDataProvider;
    private static gitFolderData?: GitFoldersDataProvider;
    private static worktreeView?: vscode.TreeView<any>;
    private static gitFolderView?: vscode.TreeView<any>;

    static register(context: vscode.ExtensionContext) {
        const settingView = vscode.window.createTreeView(SettingDataProvider.id, {
            treeDataProvider: new SettingDataProvider(),
        });

        this.worktreeData = new WorktreeDataProvider(context);
        this.gitFolderData = new GitFoldersDataProvider(context);

        const initActiveViews = () => {
            this.worktreeView?.dispose();
            this.gitFolderView?.dispose();

            const viewsToSCM = Config.get('treeView.toSCM', false);
            this.worktreeView = vscode.window.createTreeView(
                viewsToSCM ? ViewId.worktreeListSCM : ViewId.worktreeList,
                {
                    treeDataProvider: this.worktreeData!,
                    showCollapseAll: true,
                },
            );
            this.gitFolderView = vscode.window.createTreeView(
                viewsToSCM ? ViewId.gitFolderListSCM : ViewId.gitFolderList,
                {
                    treeDataProvider: this.gitFolderData!,
                    showCollapseAll: true,
                },
            );
        };

        initActiveViews();
        Config.onChange('treeView.toSCM', initActiveViews);

        const recentFolderView = vscode.window.createTreeView(RecentFoldersDataProvider.id, {
            treeDataProvider: new RecentFoldersDataProvider(context),
        });

        const favoriteView = vscode.window.createTreeView(FavoriteDataProvider.id, {
            treeDataProvider: new FavoriteDataProvider(context),
            dragAndDropController: new FavoriteAndDropController(),
        });

        // FIXME 需要选中treeItem才能保证`revealFileInOS`和`openInTerminal`成功执行
        revealTreeItemEvent.event((item) => {
            if (item.type === TreeItemKind.folder) {
                if (item.from === ViewId.favorite) favoriteView.reveal(item, { focus: true, select: true });
                if (item.from === ViewId.folderList) recentFolderView.reveal(item, { focus: true, select: true });
                return;
            }

            if (item.type === TreeItemKind.gitFolder) {
                return this.gitFolderView?.reveal(item, { focus: true, select: true });
            }

            if (item.type === TreeItemKind.worktree) {
                if (item.parent?.type === TreeItemKind.gitFolder) {
                    return this.gitFolderView?.reveal(item, { focus: true, select: true });
                }
                return this.worktreeView?.reveal(item, { focus: true, select: true });
            }
        });
        context.subscriptions.push(settingView, recentFolderView, favoriteView, {
            dispose: () => {
                this.worktreeView?.dispose();
                this.gitFolderView?.dispose();
            },
        });
    }

    static updateWorktreeView(item: WorktreeItem) {
        return this.worktreeData?.update(item);
    }

    static updateGitFolderView(item: GitFolderItem | WorktreeItem) {
        return this.gitFolderData?.update(item);
    }
}
