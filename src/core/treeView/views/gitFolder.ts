import * as vscode from 'vscode';
import { IFolderItemConfig, IWorktreeDetail } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ViewId, ContextKey } from '@/constants';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import throttle from 'lodash-es/throttle';
import debounce from 'lodash-es/debounce';
import {
    treeDataEvent,
    updateFolderEvent,
    globalStateEvent,
    toggleGitFolderViewAsEvent,
    worktreeChangeEvent,
} from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import logger from '@/core/log/logger';
import { findPrefixPath } from '@/core/util/folder';

type CommonWorktreeItem = GitFolderItem | WorktreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorktreeItem>, vscode.Disposable {
    private static readonly refreshThrottle = 800; // 800ms

    private data: IFolderItemConfig[] = GlobalState.get('gitFolders', []).sort((a, b) => a.name.localeCompare(b.name));
    private viewAsTree: boolean = true;
    private worktreeItemsMap: Map<string, WorktreeItem[]> = new Map();
    private _onDidChangeTreeData = new vscode.EventEmitter<GitFolderItem | WorktreeItem | void>();
    public readonly onDidChangeTreeData: vscode.Event<GitFolderItem | WorktreeItem | void> =
        this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, GitFoldersDataProvider.refreshThrottle, {
            leading: true,
            trailing: true,
        });
        this.initializeEventListeners(context);
        this.initializeViewState();
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            globalStateEvent.event((key) => {
                if (key === 'gitFolders') this.refresh();
            }),
            treeDataEvent.event(() => {
                process.nextTick(this.refresh);
            }),
            updateFolderEvent.event(() => {
                this.refresh();
            }),
            worktreeChangeEvent.event((uri) => {
                this.handleWorktreeChange(uri);
            }),
            toggleGitFolderViewAsEvent.event(debounce(this.handleViewAsTreeChange, 300)),
            this,
        );
    }

    private handleWorktreeChange = (uri: vscode.Uri) => {
        const prefixPath = findPrefixPath(uri.fsPath, [...this.worktreeItemsMap.keys()]);
        const items = prefixPath ? this.worktreeItemsMap.get(prefixPath) : undefined;
        if (!items) return;
        items.forEach((item) => {
            item.reload();
            this.update(item);
        });
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

    update(item: GitFolderItem | WorktreeItem | void) {
        this._onDidChangeTreeData.fire(item);
    }

    private refresh = () => {
        try {
            this.data = GlobalState.get('gitFolders', []);
            this.data.sort((a, b) => a.name.localeCompare(b.name));
            this._onDidChangeTreeData.fire();
        } catch (error) {
            logger.error(`Failed to refresh git folders: ${error}`);
        }
    };

    private async getWorktreeListWithCache(path: string): Promise<IWorktreeDetail[]> {
        try {
            return await getWorktreeList(path);
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
                const worktreeItems = worktreeList.map((row) => {
                    return new WorktreeItem(
                        { ...row, folderName: item.name },
                        vscode.TreeItemCollapsibleState.None,
                    );
                });
                this.worktreeItemsMap.set(vscode.Uri.file(item.path).fsPath, worktreeItems);
                return worktreeItems;
            }),
        );
        return worktreeItems.flat();
    }

    private getTreeViewItems(): GitFolderItem[] {
        return this.data.map(
            (item) =>
                new GitFolderItem(
                    item,
                    item.defaultOpen
                        ? vscode.TreeItemCollapsibleState.Expanded
                        : vscode.TreeItemCollapsibleState.Collapsed,
                ),
        );
    }

    private async getWorktreeItems(element: GitFolderItem): Promise<WorktreeItem[]> {
        const worktreeList = await this.getWorktreeListWithCache(element.fsPath);
        const worktreeItems = worktreeList.map((item) => {
            return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element);
        });
        this.worktreeItemsMap.set(vscode.Uri.file(element.fsPath).fsPath, worktreeItems);
        return worktreeItems;
    }

    getTreeItem(element: CommonWorktreeItem): vscode.TreeItem {
        return element;
    }

    getParent(element: CommonWorktreeItem): vscode.ProviderResult<CommonWorktreeItem> {
        return element.parent as GitFolderItem;
    }
}
