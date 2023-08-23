import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent } from './events';
import { WorkTreeDetail } from './types';
import { getFolderIcon } from './utils';

class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    constructor(item: WorkTreeDetail, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.description = item.path;
        this.iconPath = getFolderIcon(item.path);
        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };
    }
}

export class WorkTreeDataProvider implements vscode.TreeDataProvider<WorkTreeItem> {
    static id = 'git-worktree-manager';
    private data: WorkTreeDetail[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            treeDataEvent.event((treeList) => {
                this.data = treeList;
                this._onDidChangeTreeData.fire();
            }),
        );
        this.refresh();
    }
    refresh() {
        updateTreeDataEvent.fire();
    }
    getTreeItem(element: WorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: WorkTreeItem | undefined): vscode.ProviderResult<WorkTreeItem[]> {
        return this.data.map((item) => {
            return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None);
        });
    }
}
