import * as vscode from 'vscode';
import { IFolderItemConfig } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ContextKey } from '@/constants';
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
    private worktreeRootMap: Map<string, GitFolderItem> = new Map();
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
        if (!this.viewAsTree) {
            // TODO only update the worktree items that are changed
            this.refresh();
            return;
        }
        const prefixPath = findPrefixPath(uri.fsPath, [...this.worktreeRootMap.keys()]);
        const gitFolderItem = prefixPath ? this.worktreeRootMap.get(prefixPath) : undefined;
        if (!gitFolderItem) return;
        this.update(gitFolderItem);
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
                const worktreeList = await getWorktreeList(item.path);
                const worktreeItems = worktreeList.map((row) => {
                    return new WorktreeItem({ ...row, folderName: item.name }, vscode.TreeItemCollapsibleState.None);
                });
                return worktreeItems;
            }),
        );
        // TODO only update the worktree items that are changed
        return worktreeItems.flat();
    }

    private getTreeViewItems(): GitFolderItem[] {
        return this.data.map((item) => {
            const gitFolderItem = new GitFolderItem(
                item,
                item.defaultOpen ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
            );
            this.worktreeRootMap.set(vscode.Uri.file(item.path).fsPath, gitFolderItem);
            return gitFolderItem;
        });
    }

    private async getWorktreeItems(element: GitFolderItem): Promise<WorktreeItem[]> {
        const worktreeList = await getWorktreeList(element.fsPath);
        const worktreeItems = worktreeList.map((item) => {
            return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element);
        });
        return worktreeItems;
    }

    getTreeItem(element: CommonWorktreeItem): vscode.TreeItem {
        return element;
    }

    getParent(element: CommonWorktreeItem): vscode.ProviderResult<CommonWorktreeItem> {
        return element.parent as GitFolderItem;
    }
}
