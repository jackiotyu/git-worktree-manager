import * as vscode from 'vscode';
import { TreeItemKind, Commands, ViewId, RecentItemType } from '@/constants';
import { ILoadMoreItem, IRecentItem, IWorktreeLess } from '@/types';
import path from 'path';

export class FolderItem extends vscode.TreeItem implements IWorktreeLess {
    fsPath: string = '';
    uriPath: string = '';
    readonly type = TreeItemKind.folder;

    constructor(
        public name: string,
        collapsible: vscode.TreeItemCollapsibleState,
        public item: IRecentItem,
        public readonly from: ViewId,
    ) {
        super(name, collapsible);
        this.setProperties(item);
        this.setTooltip(item);
        this.setCommand(item);
    }

    private setProperties(item: IRecentItem) {
        const isFolder = item.type === RecentItemType.folder;
        const uri = vscode.Uri.parse(item.path);
        this.contextValue = isFolder ? 'git-worktree-manager.folderItem' : 'git-worktree-manager.workspaceItem';
        this.uriPath = uri.toString();
        this.fsPath = uri.fsPath;
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

export interface IWorkspaceMainGitFolderOptions {
    // Root node of a nested repository selected for display by the user
    nested?: boolean;
    // The path is no longer valid (missing or no longer a directory)
    invalid?: boolean;
}

// Synthetic common parent node for nested repositories (not a real directory on disk)
export class NestedRepoGroupItem extends vscode.TreeItem {
    readonly type = TreeItemKind.nestedRepoGroup;

    constructor() {
        super(vscode.l10n.t('Nested Git Repositories'), vscode.TreeItemCollapsibleState.Collapsed);
        this.id = 'git-worktree-manager.nestedRepoGroup';
        this.contextValue = 'git-worktree-manager.nestedRepoGroup';
        this.iconPath = new vscode.ThemeIcon('combine');
    }
}

export class WorkspaceMainGitFolderItem extends vscode.TreeItem implements IWorktreeLess {
    readonly type = TreeItemKind.workspaceGitMainFolder;
    label?: string;
    fsPath: string = '';
    uriPath: string = '';
    name: string = '';
    // Whether this is a nested repository root selected for display by the user
    nested: boolean = false;
    parent?: NestedRepoGroupItem;

    constructor(
        filepath: string,
        collapsible: vscode.TreeItemCollapsibleState,
        options: IWorkspaceMainGitFolderOptions = {},
    ) {
        const name = path.basename(filepath);
        super(name, collapsible);
        this.label = name;
        this.setProperties(filepath, name, options);
        this.setTooltip(filepath, options);
    }

    private setProperties(filepath: string, name: string, options: IWorkspaceMainGitFolderOptions) {
        const uri = vscode.Uri.file(filepath);
        this.fsPath = uri.fsPath;
        this.uriPath = uri.toString();
        this.name = name;
        this.nested = Boolean(options.nested);
        this.description = options.invalid ? `${filepath} ${vscode.l10n.t('(not found)')}` : filepath;
        if (options.nested) {
            this.contextValue = 'git-worktree-manager.workspaceGitMainFolder.nested';
        } else {
            this.contextValue = 'git-worktree-manager.workspaceGitMainFolder';
        }
        if (options.invalid) {
            this.iconPath = new vscode.ThemeIcon('warning');
        } else if (options.nested) {
            this.iconPath = new vscode.ThemeIcon('repo');
        } else {
            this.iconPath = new vscode.ThemeIcon('root-folder');
        }
    }

    private setTooltip(filepath: string, options: IWorkspaceMainGitFolderOptions) {
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', filepath));
        if (options.invalid) {
            this.tooltip.appendMarkdown(vscode.l10n.t('$(warning) Path does not exist\n\n'));
        }
    }
}
