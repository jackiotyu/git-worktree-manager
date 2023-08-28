import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, updateFolderEvent } from '@/lib/events';
import { WorkTreeDetail } from '@/types';
import { getFolderIcon, judgeIsCurrentFolder, getWorkTreeList } from '@/utils';
import { TreeItemKind, FolderItemConfig, APP_NAME } from '@/constants';
import localize from '@/localize';

export class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    path: string;
    name: string;
    type = TreeItemKind.worktree;
    parent?: GitFolderItem;
    constructor(item: WorkTreeDetail, collapsible: vscode.TreeItemCollapsibleState, parent?: GitFolderItem) {
        super(item.name, collapsible);
        this.description = `${item.isMain ? '✨ ' : ''}${item.path}`;
        this.parent = parent;

        const isCurrent = judgeIsCurrentFolder(item.path);
        const themeColor = isCurrent ? new vscode.ThemeColor('charts.blue') : void 0;

        switch (true) {
            case item.prunable:
                this.iconPath = new vscode.ThemeIcon('error', themeColor);
                break;
            case item.locked:
                this.iconPath = new vscode.ThemeIcon('lock', themeColor);
                break;
            default:
                this.iconPath = getFolderIcon(item.path, themeColor);
                break;
        }
        let lockPost = (!item.isMain && (item.locked ? '.lock' : '.unlock')) || '';
        let mainPost = item.isMain ? '.main' : '';
        let currentPost = isCurrent ? '.current' : '';
        this.contextValue = `git-worktree-manager.worktreeItem${mainPost}${lockPost}${currentPost}`;

        this.path = item.path;
        this.name = item.name;

        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(localize('treeView.tooltip.folder', item.path));
        this.tooltip.appendMarkdown(
            `$(${item.isBranch ? 'source-control' : 'git-commit'}) ${
                item.isBranch ? localize('branch') : localize('commit')
            }  ${item.name}\n\n`,
        );
        item.prunable && this.tooltip.appendMarkdown(localize('treeView.tooltip.error'));
        item.locked && this.tooltip.appendMarkdown(localize('treeView.tooltip.lock'));
        item.isMain && this.tooltip.appendMarkdown(localize('treeView.tooltip.main'));
        !isCurrent && this.tooltip.appendMarkdown(localize('treeView.tooltip.click'));

        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };
    }
}

export class WorkTreeDataProvider implements vscode.TreeDataProvider<WorkTreeItem> {
    static id = 'git-worktree-manager-list';
    private data: WorkTreeDetail[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event((treeList) => {
                this.data = treeList;
                this._onDidChangeTreeData.fire();
            }),
        );
        this.refresh();
    }
    refresh() {
        updateTreeDataEvent.fire();
    }
    getTreeItem(element: WorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: WorkTreeItem | undefined): vscode.ProviderResult<WorkTreeItem[]> {
        return this.data.map((item) => {
            return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None);
        });
    }
}

export class GitFolderItem extends vscode.TreeItem {
    type = TreeItemKind.gitFolder;
    name: string;
    path: string;
    constructor(item: FolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.name = item.name;
        this.path = item.path;
        this.iconPath = new vscode.ThemeIcon('source-control');
        this.contextValue = 'git-worktree-manager.gitFolderItem';
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(localize('treeView.tooltip.folder', item.path));
    }
}

type CommonWorkTreeItem = GitFolderItem | WorkTreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorkTreeItem> {
    static id = 'git-worktree-manager-folders';
    private data: FolderItemConfig[] = [];
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(APP_NAME)) {
                    this.refresh();
                }
            }),
            updateTreeDataEvent.event(() => {
                this.refresh();
            }),
            updateFolderEvent.event(() => {
                this.refresh();
            }),
        );
        this.refresh();
    }

    refresh() {
        this.data = vscode.workspace.getConfiguration(APP_NAME).get<FolderItemConfig[]>('gitFolders') || [];
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: CommonWorkTreeItem | undefined): vscode.ProviderResult<CommonWorkTreeItem[]> {
        if (!element) {
            return this.data.map((item) => {
                return new GitFolderItem(item, vscode.TreeItemCollapsibleState.Collapsed);
            });
        }
        if (element.type === TreeItemKind.gitFolder) {
            return getWorkTreeList(element.path).map((item) => {
                return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None, element);
            });
        }
    }
    getTreeItem(element: CommonWorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
}
