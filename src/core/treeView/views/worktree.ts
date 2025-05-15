import * as vscode from 'vscode';
import { WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';
import { TreeItemKind, ViewId } from '@/constants';
import { treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';
import throttle from 'lodash-es/throttle';
import { IWorktreeDetail } from '@/types';

export class WorktreeDataProvider implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorktreeItem>, vscode.Disposable {
    private static readonly refreshThrottle = 800; // 800ms

    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceMainGitFolderItem | WorktreeItem | void>();
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
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event(() => {
                this._onDidChangeTreeData.fire();
            }),
            worktreeChangeEvent.event((uri) => {
                // TODO 缓存
                this._onDidChangeTreeData.fire();
            }),
            this
        );
    }

    update(item: WorkspaceMainGitFolderItem | WorktreeItem | void) {
        this._onDidChangeTreeData.fire(item);
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
