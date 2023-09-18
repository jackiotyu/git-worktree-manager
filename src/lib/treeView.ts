import * as vscode from 'vscode';
import {
    treeDataEvent,
    updateTreeDataEvent,
    updateFolderEvent,
    globalStateEvent,
    updateRecentEvent,
    toggleGitFolderViewAsEvent,
} from '@/lib/events';
import { WorkTreeDetail } from '@/types';
import { getFolderIcon, judgeIsCurrentFolder, getWorkTreeList, getRecentFolders } from '@/utils';
import { TreeItemKind, FolderItemConfig, APP_NAME, RecentFolderConfig } from '@/constants';
import { GlobalState } from '@/lib/globalState';
import localize from '@/localize';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';

export class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    path: string;
    name: string;
    type = TreeItemKind.worktree;
    parent?: GitFolderItem;
    constructor(item: WorkTreeDetail, collapsible: vscode.TreeItemCollapsibleState, parent?: GitFolderItem) {
        let finalName = item.folderName ? `${item.name} ⬸ ${item.folderName}` : item.name;
        super(finalName, collapsible);
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
    defaultOpen?: boolean = false;
    constructor(item: FolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.name = item.name;
        this.path = item.path;
        this.defaultOpen = !!item.defaultOpen;
        this.iconPath = new vscode.ThemeIcon('repo');
        this.contextValue = `git-worktree-manager.gitFolderItem.${this.defaultOpen ? 'defaultOpen' : 'defaultClose'}`;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(localize('treeView.tooltip.folder', item.path));
    }
}

type CommonWorkTreeItem = GitFolderItem | WorkTreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorkTreeItem> {
    static id = 'git-worktree-manager-folders';
    private data: FolderItemConfig[] = [];
    private viewAsTree: boolean;
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            globalStateEvent.event(throttle(() => this.refresh(), 300, { leading: true, trailing: true })),
            updateTreeDataEvent.event(throttle(() => this.refresh(), 300, { leading: true, trailing: true })),
            updateFolderEvent.event(throttle(() => this.refresh(), 300, { leading: true, trailing: true })),
            toggleGitFolderViewAsEvent.event(
                debounce((viewAsTree: boolean) => {
                    this.viewAsTree = viewAsTree;
                    vscode.commands.executeCommand(
                        'setContext',
                        'git-worktree-manager.gitFolderViewAsTree',
                        viewAsTree,
                    );
                    GlobalState.update('gitFolderViewAsTree', viewAsTree);
                }, 300),
            ),
        );
        this.refresh();
        let viewAsTree = GlobalState.get('gitFolderViewAsTree', true);
        vscode.commands.executeCommand('setContext', 'git-worktree-manager.gitFolderViewAsTree', viewAsTree);
        this.viewAsTree = viewAsTree;
    }

    refresh() {
        this.data = GlobalState.get('gitFolders', []);
        this.data.sort((a, b) => a.name.localeCompare(b.name));
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: CommonWorkTreeItem | undefined): vscode.ProviderResult<CommonWorkTreeItem[]> {
        if (!element) {
            if (!this.viewAsTree) {
                let list = this.data
                    .map((item) => {
                        return [getWorkTreeList(item.path), item] as const;
                    })
                    .map(([list, config]) => {
                        return list.map((row) => {
                            return new WorkTreeItem(
                                { ...row, folderName: config.name },
                                vscode.TreeItemCollapsibleState.None,
                                element,
                            );
                        });
                    });
                return list.flat();
            }
            return this.data.map((item) => {
                return new GitFolderItem(
                    item,
                    item.defaultOpen
                        ? vscode.TreeItemCollapsibleState.Expanded
                        : vscode.TreeItemCollapsibleState.Collapsed,
                );
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

export class FolderItem extends vscode.TreeItem {
    path: string;
    constructor(public name: string, collapsible: vscode.TreeItemCollapsibleState, item: RecentFolderConfig) {
        super(name, collapsible);
        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = 'git-worktree-manager.folderItem';
        this.path = item.path;
        this.description = item.path;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(localize('treeView.tooltip.folder', item.path));
        this.resourceUri = item.uri;
        this.command = {
            title: 'open folder',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };
    }
}

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<FolderItem> {
    static id = 'git-worktree-manager-recent';
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(updateRecentEvent.event(throttle(this.refresh, 300)));
    }
    refresh = async () => {
        this._onDidChangeTreeData.fire();
    };
    getChildren(element?: FolderItem | undefined): vscode.ProviderResult<FolderItem[]> {
        return getRecentFolders().then((list) =>
            list
                .map<RecentFolderConfig>((item) => {
                    return {
                        name: item.label || path.basename(item.folderUri.fsPath),
                        path: item.folderUri.fsPath,
                        uri: item.folderUri,
                    };
                })
                .map<FolderItem>((item) => {
                    return new FolderItem(item.name, vscode.TreeItemCollapsibleState.None, item);
                }),
        );
    }
    getTreeItem(element: FolderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
}

// TODO 分支管理（pull/push）
