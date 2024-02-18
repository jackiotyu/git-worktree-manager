import * as vscode from 'vscode';
import {
    treeDataEvent,
    updateTreeDataEvent,
    updateFolderEvent,
    globalStateEvent,
    updateRecentEvent,
    toggleGitFolderViewAsEvent,
    loadAllTreeDataEvent,
    revealTreeItemEvent,
    changeUIVisibleEvent,
} from '@/lib/events';
import { IWorkTreeDetail, ILoadMoreItem, IFolderItemConfig, IRecentFolderConfig } from '@/types';
import { getFolderIcon, judgeIncludeFolder, getWorkTreeList, getRecentFolders, getWorktreeStatus } from '@/utils';
import { TreeItemKind, APP_NAME, Commands, ViewId, WORK_TREE_SCHEME } from '@/constants';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import folderRoot from '@/lib/folderRoot';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';

export class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    path: string;
    name: string;
    readonly type = TreeItemKind.worktree;
    parent?: GitFolderItem | WorkspaceMainGitFolderItem;
    remoteRef?: string;
    remote?: string;
    isBranch?: boolean;
    constructor(
        item: IWorkTreeDetail,
        collapsible: vscode.TreeItemCollapsibleState,
        parent?: GitFolderItem | WorkspaceMainGitFolderItem,
    ) {
        let finalName = item.folderName ? `${item.name} ⇄ ${item.folderName}` : item.name;
        super(finalName, collapsible);
        this.description = `${item.isMain ? '✨ ' : ''}${item.ahead ? `${item.ahead}↑ ` : ''}${
            item.behind ? `${item.behind}↓ ` : ''
        }${item.path}`;
        this.parent = parent;
        this.id = item.path;

        const isCurrent = judgeIncludeFolder(item.path);
        const themeColor = isCurrent ? new vscode.ThemeColor('statusBarItem.remoteBackground') : void 0;

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
        let aheadPost = item.ahead ? '.ahead' : '';
        let behindPost = item.behind ? '.behind' : '';
        this.contextValue = `git-worktree-manager.worktreeItem${mainPost}${lockPost}${currentPost}${aheadPost}${behindPost}`;

        this.path = item.path;
        this.name = item.name;
        this.remoteRef = item.remoteRef;
        this.remote = item.remote;
        this.isBranch = item.isBranch;

        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
        let sourceIcon = 'git-commit';
        let sourceName = vscode.l10n.t('commit');
        if (item.isBranch) {
            sourceIcon = 'source-control';
            sourceName = vscode.l10n.t('branch');
        } else if (item.isTag) {
            sourceIcon = 'tag';
            sourceName = vscode.l10n.t('tag');
        }
        this.tooltip.appendMarkdown(`$(${sourceIcon}) ${sourceName}  ${item.name}\n\n`);
        sourceIcon !== 'git-commit' &&
            this.tooltip.appendMarkdown(`$(git-commit) ${vscode.l10n.t('commit')}  ${item.hash.slice(0, 8)}\n\n`);
        item.prunable && this.tooltip.appendMarkdown(vscode.l10n.t('$(error) Detached from the git version\n\n'));
        item.locked && this.tooltip.appendMarkdown(vscode.l10n.t('$(lock) The worktree is locked to prevent accidental purging\n\n'));
        item.isMain && this.tooltip.appendMarkdown(vscode.l10n.t('✨ Worktree main folder, cannot be cleared and locked\n\n'));
        item.ahead && this.tooltip.appendMarkdown(vscode.l10n.t('$(arrow-up) Ahead commits {0}\n\n', `${item.ahead}`));
        item.behind && this.tooltip.appendMarkdown(vscode.l10n.t('$(arrow-down) Behind commits {0}\n\n', `${item.behind}`));
        !isCurrent && this.tooltip.appendMarkdown(vscode.l10n.t('*Click to open new window for this worktree*\n\n'));

        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };

        if(item.isBranch) {
            this.resourceUri = vscode.Uri.parse(`${WORK_TREE_SCHEME}://status/worktree/${getWorktreeStatus(item)}`);
        }
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

export class WorkTreeDataProvider implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorkTreeItem> {
    static readonly id = ViewId.worktreeList;
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event(() => {
                this._onDidChangeTreeData.fire();
            }),
        );
    }
    refresh() {
        updateTreeDataEvent.fire();
    }
    getTreeItem(element: WorkspaceMainGitFolderItem | WorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(
        element?: WorkspaceMainGitFolderItem | undefined,
    ): Promise<WorkspaceMainGitFolderItem[] | WorkTreeItem[] | null | undefined> {
        if (!element) {
            const workspaceFolderNum = folderRoot.folderPathSet.size;
            const mainFolders = WorkspaceState.get('mainFolders', []);
            if (workspaceFolderNum === 1 || mainFolders.length === 1) {
                const data = await getWorkTreeList(mainFolders[0]?.path);
                return data.map((item) => {
                    return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None);
                });
            } else {
                return mainFolders.map((item) => {
                    return new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded);
                });
            }
        }

        if (element.type === TreeItemKind.workspaceGitMainFolder) {
            const data = await getWorkTreeList(element.path);
            return data.map((item) => {
                return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None, element);
            });
        }
    }
    getParent(element: WorkTreeItem): vscode.ProviderResult<WorkspaceMainGitFolderItem> {
        return element.parent as WorkspaceMainGitFolderItem;
    }
}

export class GitFolderItem extends vscode.TreeItem {
    readonly type = TreeItemKind.gitFolder;
    name: string;
    path: string;
    defaultOpen?: boolean = false;
    readonly parent = void 0;
    constructor(item: IFolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.id = `${item.name} ~~ ${item.path}`;
        this.name = item.name;
        this.path = item.path;
        this.defaultOpen = !!item.defaultOpen;
        this.iconPath = new vscode.ThemeIcon('repo');
        this.contextValue = `git-worktree-manager.gitFolderItem.${this.defaultOpen ? 'defaultOpen' : 'defaultClose'}`;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
    }
}

type CommonWorkTreeItem = GitFolderItem | WorkTreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorkTreeItem>, vscode.Disposable {
    static readonly id = ViewId.gitFolderList;
    private data: IFolderItemConfig[] = [];
    private viewAsTree: boolean;
    private loadedMap: Map<string, boolean> = new Map();
    _onDidChangeTreeData = new vscode.EventEmitter<GitFolderItem | void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1500, { leading: true, trailing: true });
        context.subscriptions.push(
            globalStateEvent.event(this.refresh),
            treeDataEvent.event(() => process.nextTick(this.refresh)),
            updateFolderEvent.event(this.refresh),
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
            this,
        );
        let viewAsTree = GlobalState.get('gitFolderViewAsTree', true);
        vscode.commands.executeCommand('setContext', 'git-worktree-manager.gitFolderViewAsTree', viewAsTree);
        this.viewAsTree = viewAsTree;
    }

    dispose() {
        this.loadedMap.clear();
    }

    refresh = () => {
        this.data = GlobalState.get('gitFolders', []);
        this.data.sort((a, b) => a.name.localeCompare(b.name));
        this._onDidChangeTreeData.fire();
    };

    async getChildren(element?: CommonWorkTreeItem | undefined): Promise<CommonWorkTreeItem[] | undefined> {
        if (!element) {
            // TODO 使用worktreeEvent刷新数据
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
            // 延迟获取pull/push提交数
            const loaded = this.loadedMap.has(element.path);
            let list = await getWorkTreeList(element.path, !loaded);
            if (!loaded) {
                this.loadedMap.set(element.path, true);
                setImmediate(() => {
                    this._onDidChangeTreeData.fire(element);
                });
            }
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
    getParent(element: CommonWorkTreeItem): vscode.ProviderResult<CommonWorkTreeItem> {
        return element.parent as GitFolderItem;
    }
}

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

type RecentFolderItem = FolderLoadMore | FolderItem;

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<RecentFolderItem> {
    static readonly id = ViewId.folderList;
    private pageNo = 1;
    private pageSize = 20;
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1000, { leading: true, trailing: true });
        context.subscriptions.push(
            updateRecentEvent.event(this.refresh),
            vscode.commands.registerCommand(Commands.loadMoreRecentFolder, this.loadMoreFolder),
            loadAllTreeDataEvent.event(this.loadAllCheck),
        );
        // HACK 强制获取一次最近的文件夹，加快访问速度
        vscode.commands.executeCommand('_workbench.getRecentlyOpened');
    }
    refresh = () => {
        this._onDidChangeTreeData.fire();
    };
    loadAllCheck = (viewId: ViewId) => {
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
            .map<IRecentFolderConfig>((item) => {
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
        return itemList;
    }
    getTreeItem(element: FolderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getParent(element: RecentFolderItem): vscode.ProviderResult<RecentFolderItem> {
        return void 0;
    }
}

export type AllViewItem = WorkTreeItem | GitFolderItem | FolderItem;

export class TreeViewManager {
    static register(context: vscode.ExtensionContext) {
        const worktreeView = vscode.window.createTreeView(WorkTreeDataProvider.id, {
            treeDataProvider: new WorkTreeDataProvider(context),
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
                    if (item.parent?.type === TreeItemKind.gitFolder)
                        {return gitFolderView.reveal(item, { focus: true, select: true });}
                    return worktreeView.reveal(item, { focus: true, select: true });
            }
        });
        context.subscriptions.push(
            worktreeView,
            gitFolderView,
            recentFolderView,
            worktreeView.onDidChangeVisibility((event) => {
                changeUIVisibleEvent.fire({ type: TreeItemKind.worktree, visible: event.visible });
            }),
            gitFolderView.onDidChangeVisibility((event) => {
                changeUIVisibleEvent.fire({ type: TreeItemKind.gitFolder, visible: event.visible });
            }),
        );
    }
}
