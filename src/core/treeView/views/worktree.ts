import * as vscode from 'vscode';
import { WorktreeItem, WorkspaceMainGitFolderItem } from '@/core/treeView/items';
import { TreeItemKind, ViewId } from '@/constants';
import { treeDataEvent, updateTreeDataEvent, worktreeChangeEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { WorkspaceState } from '@/core/state';
import folderRoot from '@/core/folderRoot';

export class WorktreeDataProvider implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorktreeItem> {
    static readonly id = ViewId.worktreeList;
    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceMainGitFolderItem | WorktreeItem | void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event(() => {
                this._onDidChangeTreeData.fire();
            }),
            worktreeChangeEvent.event(() => {
                // TODO 更新当前对应git仓库
                this._onDidChangeTreeData.fire();
            })
        );
    }
    refresh() {
        updateTreeDataEvent.fire();
    }
    getTreeItem(element: WorkspaceMainGitFolderItem | WorktreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(
        element?: WorkspaceMainGitFolderItem | undefined,
    ): Promise<WorkspaceMainGitFolderItem[] | WorktreeItem[] | null | undefined> {
        if (!element) {
            const workspaceFolderNum = folderRoot.folderPathSet.size;
            const mainFolders = WorkspaceState.get('mainFolders', []);
            if (workspaceFolderNum === 1 || mainFolders.length === 1) {
                const data = await getWorktreeList(mainFolders[0]?.path);
                return data.map((item) => {
                    return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None);
                });
            } else {
                return mainFolders.map((item) => {
                    return new WorkspaceMainGitFolderItem(item.path, vscode.TreeItemCollapsibleState.Expanded);
                });
            }
        }

        if (element.type === TreeItemKind.workspaceGitMainFolder) {
            const data = await getWorktreeList(element.path);
            return data.map((item) => {
                return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element);
            });
        }
    }
    getParent(element: WorktreeItem): vscode.ProviderResult<WorkspaceMainGitFolderItem> {
        return element.parent as WorkspaceMainGitFolderItem;
    }
}
