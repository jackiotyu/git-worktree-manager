import * as vscode from 'vscode';
import { TreeItemKind, Commands, ViewId, RecentItemType } from '@/constants';
import { ILoadMoreItem, IRecentItem } from '@/types';
import path from 'path';

export class FolderItem extends vscode.TreeItem {
    path: string = '';
    readonly type = TreeItemKind.folder;

    constructor(public name: string, collapsible: vscode.TreeItemCollapsibleState, public item: IRecentItem) {
        super(name, collapsible);
        this.setProperties(item);
        this.setTooltip(item);
        this.setCommand(item);
    }

    private setProperties(item: IRecentItem) {
        const isFolder = item.type === RecentItemType.folder;
        const uri = vscode.Uri.parse(item.path);
        this.contextValue = isFolder ? 'git-worktree-manager.folderItem' : 'git-worktree-manager.workspaceItem';
        this.path = uri.path;
        this.description = uri.fsPath;
        this.iconPath = isFolder ? vscode.ThemeIcon.Folder : new vscode.ThemeIcon('layers');
        if (isFolder) this.resourceUri = uri;
    }

    private setTooltip(item: IRecentItem) {
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', vscode.Uri.parse(item.path).fsPath));
    }

    private setCommand(item: IRecentItem) {
        this.command = {
            title: 'open folder',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.parse(item.path), { forceNewWindow: true }],
        };
    }
}

export class FolderLoadMore extends vscode.TreeItem implements ILoadMoreItem {
    readonly viewId = ViewId.folderList;

    constructor(public name: string = vscode.l10n.t('Load More...')) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.setProperties();
        this.setCommand();
    }

    private setProperties() {
        this.contextValue = 'git-worktree-manager.loadMore';
    }

    private setCommand() {
        this.command = {
            title: vscode.l10n.t('Load More...'),
            command: Commands.loadMoreRecentFolder,
        };
    }
}

export class WorkspaceMainGitFolderItem extends vscode.TreeItem {
    readonly type = TreeItemKind.workspaceGitMainFolder;
    label?: string;
    path: string = '';
    name: string = '';

    constructor(filepath: string, collapsible: vscode.TreeItemCollapsibleState) {
        const name = path.basename(filepath);
        super(name, collapsible);
        this.setProperties(filepath, name);
        this.setTooltip(filepath);
    }

    private setProperties(filepath: string, name: string) {
        this.path = filepath;
        this.name = name;
        this.description = filepath;
        this.contextValue = `git-worktree-manager.workspaceGitMainFolder`;
    }

    private setTooltip(filepath: string) {
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', filepath));
    }
}
