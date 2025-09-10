import * as vscode from 'vscode';
import { WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';
import { TreeItemKind, ViewId } from '@/constants';
import { treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';
import throttle from 'lodash-es/throttle';
import { IWorktreeDetail } from '@/types';
import { findPrefixPath } from '@/core/util/folder';

export class WorktreeDataProvider
    implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorktreeItem>, vscode.Disposable
{
    private static readonly refreshThrottle = 150; // 150ms
    private worktreeItemsMap: Map<string, WorktreeItem[]> = new Map();

    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceMainGitFolderItem | WorktreeItem | void>();
    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, WorktreeDataProvider.refreshThrottle, {
            leading: false,
            trailing: true,
        });
        this.triggerChangeTreeData = throttle(this.triggerChangeTreeData, WorktreeDataProvider.refreshThrottle, {
            leading: false,
            trailing: true,
        });
        this.initializeEventListeners(context);
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event(() => {
                this.triggerChangeTreeData();
            }),
            worktreeChangeEvent.event((uri) => {
                this.handleWorktreeChange(uri);
            }),
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

    update(item: WorkspaceMainGitFolderItem | WorktreeItem | void) {
        this._onDidChangeTreeData.fire(item);
    }

    triggerChangeTreeData() {
        this._onDidChangeTreeData.fire();
    }

    refresh() {
        updateTreeDataEvent.fire();
    }

    private async getWorktreeListWithCache(path: string): Promise<IWorktreeDetail[]> {
        const data = await getWorktreeList(path);
        return data;
    }

    getTreeItem(element: WorkspaceMainGitFolderItem | WorktreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(
        element?: WorkspaceMainGitFolderItem,
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
            const mainFolderPath = mainFolders[0]?.path;
            const data = await this.getWorktreeListWithCache(mainFolderPath);
            const worktreeItems = data.map((item) => {
                return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None);
            });
            if (mainFolderPath) {
                this.worktreeItemsMap.set(vscode.Uri.file(mainFolderPath).fsPath, worktreeItems);
            }
            return worktreeItems;
        }

        return mainFolders.map(
            (item) => new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded),
        );
    }

    private async getWorktreeItems(element: WorkspaceMainGitFolderItem): Promise<WorktreeItem[]> {
        const data = await this.getWorktreeListWithCache(element.fsPath);
        const worktreeItems = data.map((item) => {
            return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element);
        });
        this.worktreeItemsMap.set(vscode.Uri.file(element.fsPath).fsPath, worktreeItems);
        return worktreeItems;
    }

    getParent(element: WorktreeItem): vscode.ProviderResult<WorkspaceMainGitFolderItem> {
        return element.parent as WorkspaceMainGitFolderItem;
    }
}
