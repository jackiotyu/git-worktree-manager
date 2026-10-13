import * as vscode from 'vscode';
import path from 'path';
import {
    NestedRepoGroupItem,
    WorktreeGroupItem,
    WorktreeItem,
    WorkspaceMainGitFolderItem,
} from '@/core/treeView/items';
import { TreeItemKind } from '@/constants';
import { globalStateEvent, treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';
import throttle from 'lodash-es/throttle';
import { IWorktreeDetail } from '@/types';
import { findPrefixPath } from '@/core/util/folder';
import { getRepositoryWorktreeGroups } from '@/core/util/worktreeGroup';
import { comparePath, isSubPath, toSimplePath } from '@/core/util/path';
import { Config } from '@/core/config/setting';
import { sortWorktrees } from '@/core/util/worktreeSort';
import { getNestedRepos } from '@/core/util/nestedRepo';


type WorktreeViewItem = NestedRepoGroupItem | WorkspaceMainGitFolderItem | WorktreeGroupItem | WorktreeItem;

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

        if (element.type === TreeItemKind.nestedRepoGroup) {
            return this.getNestedRepoItems(element);
        }

        if (element.type === TreeItemKind.worktreeGroup) {
            return element.children;
        }
    }

    // Nested repositories registered for display by the user, excluding paths that duplicate workspace repositories
    private getNestedRepoPaths(): string[] {
        const mainFolderPaths = new Set(WorkspaceState.get('mainFolders', []).map((item) => toSimplePath(item.path)));
        const registered = getNestedRepos().filter((repo) => !mainFolderPaths.has(repo));
        return [...new Set(registered)].sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
    }

    private checkOnlyOneMainFolder() {
        if (this.getNestedRepoPaths().length) return false;
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

        this.worktreeRootMap.clear();
        const items: WorktreeViewItem[] = mainFolders.map((item) => {
            const gitFolderItem = new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded);
            this.worktreeRootMap.set(vscode.Uri.file(item.path).fsPath, gitFolderItem);
            return gitFolderItem;
        });

        if (this.getNestedRepoPaths().length) {
            items.push(new NestedRepoGroupItem());
        }

        return items;
    }

    private async getNestedRepoItems(group: NestedRepoGroupItem): Promise<WorkspaceMainGitFolderItem[]> {
        const items: WorkspaceMainGitFolderItem[] = [];
        for (const nestedPath of this.getNestedRepoPaths()) {
            const isValidRepository = comparePath(await getWorktreeTopLevel(nestedPath), nestedPath);
            const nestedItem = new WorkspaceMainGitFolderItem(nestedPath, vscode.TreeItemCollapsibleState.Expanded, {
                nested: true,
                invalid: !isValidRepository,
            });
            nestedItem.parent = group;
            this.worktreeRootMap.set(vscode.Uri.file(nestedPath).fsPath, nestedItem);
            items.push(nestedItem);
        }
        return items;
    }

    private async getRepositoryItems(
        repositoryPath: string,
        parent?: WorkspaceMainGitFolderItem,
    ): Promise<Array<WorktreeGroupItem | WorktreeItem>> {
        const data = await sortWorktrees(
            await this.getWorktreeListWithCache(repositoryPath),
            Config.get('treeView.worktreeSortOrder', 'default'),
        );
        const groups = getRepositoryWorktreeGroups(repositoryPath).sort((a, b) => a.name.localeCompare(b.name));
        const groupsById = new Map(groups.map((group) => [group.id, group]));
        const groupItems = groups.map((group) => new WorktreeGroupItem(group, parent));
        const ungroupedItems: WorktreeItem[] = [];
        // Only nested repositories need marking: the worktree path is under the current workspace folder
        const workspaceFolders = parent?.nested ? [...folderRoot.folderPathSet] : [];
        const inWorkspace = (worktreePath: string) =>
            workspaceFolders.some((folder) => isSubPath(folder, worktreePath));

        for (const worktree of data) {
            const groupItem = groupItems.find((item) => {
                const group = groupsById.get(item.groupId);
                return group?.worktreePaths.some((worktreePath) => comparePath(worktreePath, worktree.path));
            });
            if (groupItem) {
                groupItem.children.push(
                    new WorktreeItem(
                        worktree,
                        vscode.TreeItemCollapsibleState.None,
                        groupItem,
                        inWorkspace(worktree.path),
                    ),
                );
            } else {
                ungroupedItems.push(
                    new WorktreeItem(
                        worktree,
                        vscode.TreeItemCollapsibleState.None,
                        parent,
                        inWorkspace(worktree.path),
                    ),
                );
            }
        }

        return [...groupItems, ...ungroupedItems];
    }

    getParent(element: WorktreeViewItem): vscode.ProviderResult<WorktreeViewItem> {
        if (element.type === TreeItemKind.workspaceGitMainFolder) return element.parent;
        if (element.type === TreeItemKind.nestedRepoGroup) return;
        if (element.parent?.type === TreeItemKind.gitFolder) return;
        return element.parent;
    }
}
