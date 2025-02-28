import * as vscode from 'vscode';
import { WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';
import { TreeItemKind, ViewId } from '@/constants';
import { treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';
import throttle from 'lodash-es/throttle';
import { IWorktreeDetail } from '@/types';

interface WorktreeCache {
    timestamp: number;
    data: IWorktreeDetail[];
}

export class WorktreeDataProvider implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorktreeItem>, vscode.Disposable {
    static readonly id = ViewId.worktreeList;
    private static readonly cacheTimeout = 30000; // 30s
    private static readonly refreshThrottle = 800; // 800ms

    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceMainGitFolderItem | WorktreeItem | void>();
    private worktreeCache: Map<string, WorktreeCache> = new Map();
    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, WorktreeDataProvider.refreshThrottle, {
            leading: true,
            trailing: true
        });
        this.initializeEventListeners(context);
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
        this.worktreeCache.clear();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event(() => {
                this._onDidChangeTreeData.fire();
            }),
            worktreeChangeEvent.event((uri) => {
                if (uri) {
                    this.worktreeCache.delete(uri.fsPath);
                }
                this._onDidChangeTreeData.fire();
            }),
            this
        );
    }

    refresh() {
        updateTreeDataEvent.fire();
    }

    private async getWorktreeListWithCache(path: string, forceUpdate = false): Promise<IWorktreeDetail[]> {
        const now = Date.now();
        const cached = this.worktreeCache.get(path);

        if (!forceUpdate && cached && (now - cached.timestamp < WorktreeDataProvider.cacheTimeout)) {
            return cached.data;
        }

        const data = await getWorktreeList(path, forceUpdate);
        this.worktreeCache.set(path, { timestamp: now, data });
        return data;
    }

    getTreeItem(element: WorkspaceMainGitFolderItem | WorktreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(
        element?: WorkspaceMainGitFolderItem
    ): Promise<WorkspaceMainGitFolderItem[] | WorktreeItem[] | null | undefined> {
        if (!element) {
            return this.getRootItems();
        }

        if (element.type === TreeItemKind.workspaceGitMainFolder) {
            return this.getWorktreeItems(element);
        }
    }

    private async getRootItems(): Promise<WorkspaceMainGitFolderItem[] | WorktreeItem[]> {
        const workspaceFolderNum = folderRoot.folderPathSet.size;
        const mainFolders = WorkspaceState.get('mainFolders', []);

        if (workspaceFolderNum === 1 || mainFolders.length === 1) {
            const data = await this.getWorktreeListWithCache(mainFolders[0]?.path);
            return data.map((item) => 
                new WorktreeItem(item, vscode.TreeItemCollapsibleState.None)
            );
        }

        return mainFolders.map((item) => 
            new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded)
        );
    }

    private async getWorktreeItems(element: WorkspaceMainGitFolderItem): Promise<WorktreeItem[]> {
        const data = await this.getWorktreeListWithCache(element.path);
        return data.map((item) => 
            new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element)
        );
    }

    getParent(element: WorktreeItem): vscode.ProviderResult<WorkspaceMainGitFolderItem> {
        return element.parent as WorkspaceMainGitFolderItem;
    }
}
