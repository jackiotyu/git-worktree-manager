import * as vscode from 'vscode';
import { WorkTreeItem, WorkspaceMainGitFolderItem } from '@/lib/treeItem';
import { TreeItemKind, ViewId } from '@/constants';
import {
    treeDataEvent,
    updateTreeDataEvent,
} from '@/lib/events';
import { getWorkTreeList } from '@/utils';
import { WorkspaceState } from '@/lib/globalState';
import folderRoot from '@/lib/folderRoot';

export class WorkTreeDataProvider implements vscode.TreeDataProvider<WorkspaceMainGitFolderItem | WorkTreeItem> {
    static readonly id = ViewId.worktreeList;
    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceMainGitFolderItem | WorkTreeItem | void>();
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