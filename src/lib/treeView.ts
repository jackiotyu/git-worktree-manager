import * as vscode from 'vscode';
import {
    treeDataEvent,
    updateTreeDataEvent,
    updateFolderEvent,
    globalStateEvent,
    updateRecentEvent,
    toggleGitFolderViewAsEvent,
    loadAllTreeDataEvent,
} from '@/lib/events';
import { WorkTreeDetail, LoadMoreItem } from '@/types';
import { getFolderIcon, judgeIsCurrentFolder, getWorkTreeList, getRecentFolders } from '@/utils';
import { TreeItemKind, FolderItemConfig, APP_NAME, RecentFolderConfig, Commands, ViewId } from '@/constants';
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
        let finalName = item.folderName ? `${item.name} ⇄ ${item.folderName}` : item.name;
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
    static id = ViewId.gitWorktreeManagerList;
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
    static id = ViewId.gitWorktreeManagerFolders;
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

    async getChildren(element?: CommonWorkTreeItem | undefined): Promise<CommonWorkTreeItem[] | undefined> {
        if (!element) {
            if (!this.viewAsTree) {
                let itemList = await Promise.all(
                    this.data.map(async (item) => {
                        let list = await getWorkTreeList(item.path);
                        return [list, item] as const;
                    }),
                );
                let list = itemList.map(([list, config]) => {
                    return list.map((row) => {
                        return new WorkTreeItem(
                            { ...row, folderName: config.name },
                            vscode.TreeItemCollapsibleState.None,
                            element,
                        );
                    });
                });
                return Promise.resolve(list.flat());
            }
            return Promise.resolve(
                this.data.map((item) => {
                    return new GitFolderItem(
                        item,
                        item.defaultOpen
                            ? vscode.TreeItemCollapsibleState.Expanded
                            : vscode.TreeItemCollapsibleState.Collapsed,
                    );
                }),
            );
        }
        if (element.type === TreeItemKind.gitFolder) {
            let list = await getWorkTreeList(element.path);
            return Promise.resolve(
                list.map((item) => {
                    return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None, element);
                }),
            );
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

export class FolderLoadMore extends vscode.TreeItem implements LoadMoreItem {
    viewId = ViewId.gitWorktreeManagerRecent;
    constructor(public name = localize('treeView.item.loadMore')) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'git-worktree-manager.loadMore';
        this.command = {
            title: localize('treeView.item.loadMore'),
            command: Commands.loadMoreRecentFolder,
        };
    }
}

type RecentFolderItem = FolderLoadMore | FolderItem;

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<RecentFolderItem> {
    static id: string = ViewId.gitWorktreeManagerRecent;
    private pageNo = 1;
    private pageSize = 40;
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            updateRecentEvent.event(throttle(this.refresh, 300)),
            vscode.commands.registerCommand(Commands.loadMoreRecentFolder, this.loadMoreFolder),
            loadAllTreeDataEvent.event(this.loadAllCheck),
        );
    }
    refresh = async () => {
        this._onDidChangeTreeData.fire();
    };
    loadAllCheck = (viewId: string) => {
        if (viewId === RecentFoldersDataProvider.id) {
            this.pageSize = Infinity;
            this.refresh();
        }
    };
    loadMoreFolder = () => {
        this.pageNo += 1;
        this.refresh();
    };
    async getChildren(element?: RecentFolderItem | undefined): Promise<RecentFolderItem[]> {
        let folders = await getRecentFolders();
        let itemList = folders
            .slice(0, this.pageNo * this.pageSize)
            .map<RecentFolderConfig>((item) => {
                return {
                    name: item.label || path.basename(item.folderUri.fsPath),
                    path: item.folderUri.fsPath,
                    uri: item.folderUri,
                };
            })
            .map<RecentFolderItem>((item) => {
                return new FolderItem(item.name, vscode.TreeItemCollapsibleState.None, item);
            });
        if (itemList.length < folders.length) {
            itemList.push(new FolderLoadMore());
        }
        return Promise.resolve(itemList);
    }
    getTreeItem(element: FolderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
}

// TODO 分支管理（pull/push）
