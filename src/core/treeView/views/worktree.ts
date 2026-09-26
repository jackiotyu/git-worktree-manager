import * as vscode from 'vscode';
import { WorktreeGroupItem, WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';
import { TreeItemKind } from '@/constants';
import { globalStateEvent, treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';
import throttle from 'lodash-es/throttle';
import { IWorktreeDetail } from '@/types';
import { findPrefixPath } from '@/core/util/folder';
import { getRepositoryWorktreeGroups } from '@/core/util/worktreeGroup';
import { comparePath } from '@/core/util/path';

type WorktreeViewItem = WorkspaceMainGitFolderItem | WorktreeGroupItem | WorktreeItem;

export class WorktreeDataProvider implements vscode.TreeDataProvider<WorktreeViewItem>, vscode.Disposable {
    private static readonly refreshThrottle = 150; // 150ms
    private worktreeRootMap: Map<string, WorkspaceMainGitFolderItem> = new Map();
    private mainFolderPath: string = '';

    private _onDidChangeTreeData = new vscode.EventEmitter<WorktreeViewItem | void>();
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
            globalStateEvent.event((key) => {
                if (key === 'worktreeGroups') this.triggerChangeTreeData();
            }),
            worktreeChangeEvent.event((uri) => {
                this.handleWorktreeChange(uri);
            }),
            this,
        );
    }

    private handleWorktreeChange = (uri: vscode.Uri) => {
        if (this.checkOnlyOneMainFolder()) {
            if (uri.fsPath.startsWith(this.mainFolderPath)) {
                this.triggerChangeTreeData();
            }
            return;
        }
        const prefixPath = findPrefixPath(uri.fsPath, [...this.worktreeRootMap.keys()]);
        const gitFolderItem = prefixPath ? this.worktreeRootMap.get(prefixPath) : undefined;
        if (!gitFolderItem) return;
        this.update(gitFolderItem);
    };

    update(item: WorktreeViewItem | void) {
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

    getTreeItem(element: WorktreeViewItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: WorktreeViewItem): Promise<WorktreeViewItem[] | null | undefined> {
        if (!element) {
            return this.getRootItems();
        }

        if (element.type === TreeItemKind.workspaceGitMainFolder) {
            return this.getRepositoryItems(element.fsPath, element);
        }

        if (element.type === TreeItemKind.worktreeGroup) {
            return element.children;
        }
    }

    private checkOnlyOneMainFolder() {
        const workspaceFolderNum = folderRoot.folderPathSet.size;
        const mainFolders = WorkspaceState.get('mainFolders', []);
        return workspaceFolderNum === 1 || mainFolders.length === 1;
    }

    private async getRootItems(): Promise<WorktreeViewItem[]> {
        const mainFolders = WorkspaceState.get('mainFolders', []);
        if (this.checkOnlyOneMainFolder()) {
            const mainFolderPath = mainFolders[0]?.path || void 0;
            if (!mainFolderPath) return [];
            this.mainFolderPath = vscode.Uri.file(mainFolderPath).fsPath;
            return this.getRepositoryItems(mainFolderPath);
        }

        return mainFolders.map((item) => {
            const gitFolderItem = new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded);
            this.worktreeRootMap.set(vscode.Uri.file(item.path).fsPath, gitFolderItem);
            return gitFolderItem;
        });
    }

    private async getRepositoryItems(
        repositoryPath: string,
        parent?: WorkspaceMainGitFolderItem,
    ): Promise<Array<WorktreeGroupItem | WorktreeItem>> {
        const data = await this.getWorktreeListWithCache(repositoryPath);
        const groups = getRepositoryWorktreeGroups(repositoryPath).sort((a, b) => a.name.localeCompare(b.name));
        const groupsById = new Map(groups.map((group) => [group.id, group]));
        const groupItems = groups.map((group) => new WorktreeGroupItem(group, parent));
        const ungroupedItems: WorktreeItem[] = [];

        for (const worktree of data) {
            const groupItem = groupItems.find((item) => {
                const group = groupsById.get(item.groupId);
                return group?.worktreePaths.some((worktreePath) => comparePath(worktreePath, worktree.path));
            });
            if (groupItem) {
                groupItem.children.push(new WorktreeItem(worktree, vscode.TreeItemCollapsibleState.None, groupItem));
            } else {
                ungroupedItems.push(new WorktreeItem(worktree, vscode.TreeItemCollapsibleState.None, parent));
            }
        }

        return [...groupItems, ...ungroupedItems];
    }

    getParent(element: WorktreeViewItem): vscode.ProviderResult<WorktreeViewItem> {
        if (element.type === TreeItemKind.workspaceGitMainFolder) return;
        if (element.parent?.type === TreeItemKind.gitFolder) return;
        return element.parent;
    }
}
