import * as vscode from 'vscode';
import { IFolderItemConfig, IWorktreeDetail } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ViewId, ContextKey } from '@/constants';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import throttle from 'lodash-es/throttle';
import debounce from 'lodash-es/debounce';
import { treeDataEvent, updateFolderEvent, globalStateEvent, toggleGitFolderViewAsEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import logger from '@/core/log/logger';

type CommonWorktreeItem = GitFolderItem | WorktreeItem;

interface WorktreeCache {
    timestamp: number;
    data: IWorktreeDetail[];
}

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorktreeItem>, vscode.Disposable {
    static readonly id = ViewId.gitFolderList;
    private static readonly cacheTimeout = 30000; // 30s
    private static readonly refreshThrottle = 800; // 800ms

    private data: IFolderItemConfig[] = [];
    private viewAsTree: boolean = true;
    private worktreeCache: Map<string, WorktreeCache> = new Map();
    private _onDidChangeTreeData = new vscode.EventEmitter<GitFolderItem | void>();
    public readonly onDidChangeTreeData: vscode.Event<GitFolderItem | void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, GitFoldersDataProvider.refreshThrottle, { 
            leading: true, 
            trailing: true 
        });
        this.initializeEventListeners(context);
        this.initializeViewState();
    }

    dispose() {
        this.worktreeCache.clear();
        this._onDidChangeTreeData.dispose();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            globalStateEvent.event((key) => {
                if (key === 'gitFolders') this.refresh();
            }),
            treeDataEvent.event(() => process.nextTick(this.refresh)),
            updateFolderEvent.event(this.refresh),
            worktreeChangeEvent.event(this.handleWorktreeChange),
            toggleGitFolderViewAsEvent.event(
                debounce(this.handleViewAsTreeChange, 300)
            ),
            this,
        );
    }

    private handleWorktreeChange = (uri?: vscode.Uri) => {
        if (uri) {
            this.worktreeCache.delete(uri.fsPath);
            this.refresh();
        }
    };

    private handleViewAsTreeChange = (viewAsTree: boolean) => {
        const changed = this.viewAsTree !== viewAsTree;
        this.viewAsTree = viewAsTree;
        vscode.commands.executeCommand('setContext', ContextKey.gitFolderViewAsTree, viewAsTree);
        GlobalState.update('gitFolderViewAsTree', viewAsTree);
        changed && this.refresh();
    };

    private initializeViewState() {
        this.viewAsTree = GlobalState.get('gitFolderViewAsTree', true);
        queueMicrotask(() => {
            vscode.commands.executeCommand('setContext', ContextKey.gitFolderViewAsTree, this.viewAsTree);
        });
    }

    private refresh = () => {
        try {
            this.data = GlobalState.get('gitFolders', []);
            this.data.sort((a, b) => a.name.localeCompare(b.name));
            this.worktreeCache.clear();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            logger.error(`Failed to refresh git folders: ${error}`);
        }
    };

    private async getWorktreeListWithCache(path: string): Promise<IWorktreeDetail[]> {
        const now = Date.now();
        const cached = this.worktreeCache.get(path);

        if (cached && (now - cached.timestamp < GitFoldersDataProvider.cacheTimeout)) {
            return cached.data;
        }

        try {
            const skipRemote = false;
            const data = await getWorktreeList(path, skipRemote);
            this.worktreeCache.set(path, { timestamp: now, data });
            return data;
        } catch (error) {
            logger.error(`Failed to get worktree list for ${path}: ${error}`);
            return [];
        }
    }

    async getChildren(element?: CommonWorktreeItem): Promise<CommonWorktreeItem[] | undefined> {
        if (!element) {
            return this.viewAsTree ? this.getTreeViewItems() : this.getFlatViewItems();
        }

        if (element.type === TreeItemKind.gitFolder) {
            return this.getWorktreeItems(element);
        }
    }

    private async getFlatViewItems(): Promise<WorktreeItem[]> {
        const worktreeItems = await Promise.all(
            this.data.map(async (item) => {
                const worktreeList = await this.getWorktreeListWithCache(item.path);
                return worktreeList.map(
                    (row) => new WorktreeItem(
                        { ...row, folderName: item.name },
                        vscode.TreeItemCollapsibleState.None,
                    ),
                );
            }),
        );
        return worktreeItems.flat();
    }

    private getTreeViewItems(): GitFolderItem[] {
        return this.data.map(
            (item) => new GitFolderItem(
                item,
                item.defaultOpen
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.Collapsed,
            ),
        );
    }

    private async getWorktreeItems(element: GitFolderItem): Promise<WorktreeItem[]> {
        const worktreeList = await this.getWorktreeListWithCache(element.path);
        return worktreeList.map((item) => 
            new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element)
        );
    }

    getTreeItem(element: CommonWorktreeItem): vscode.TreeItem {
        return element;
    }

    getParent(element: CommonWorktreeItem): vscode.ProviderResult<CommonWorktreeItem> {
        return element.parent as GitFolderItem;
    }
}
