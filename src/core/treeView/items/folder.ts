import * as vscode from 'vscode';
import { TreeItemKind, Commands, ViewId } from '@/constants';
import { ILoadMoreItem, IRecentFolderConfig } from '@/types';
import path from 'path';

export class FolderItem extends vscode.TreeItem {
    path: string;
    readonly type = TreeItemKind.folder;
    constructor(public name: string, collapsible: vscode.TreeItemCollapsibleState, item: IRecentFolderConfig) {
        super(name, collapsible);
        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = 'git-worktree-manager.folderItem';
        this.path = item.path;
        this.description = item.path;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
        this.resourceUri = item.uri;
        this.command = {
            title: 'open folder',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };
    }
}

export class FolderLoadMore extends vscode.TreeItem implements ILoadMoreItem {
    readonly viewId = ViewId.folderList;
    constructor(public name = vscode.l10n.t('Load More...')) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'git-worktree-manager.loadMore';
        this.command = {
            title: vscode.l10n.t('Load More...'),
            command: Commands.loadMoreRecentFolder,
        };
    }
}

export class WorkspaceMainGitFolderItem extends vscode.TreeItem {
    readonly type = TreeItemKind.workspaceGitMainFolder;
    label?: string;
    path: string;
    name: string;
    constructor(label: string, collapsible: vscode.TreeItemCollapsibleState) {
        const name = path.basename(label);
        super(name, collapsible);
        this.path = label;
        this.name = name;
        this.description = label;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', label));
        this.contextValue = `git-worktree-manager.workspaceGitMainFolder`;
    }
}
