import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, updateFolderEvent } from '@/lib/events';
import { WorkTreeDetail } from '@/types';
import { getFolderIcon, judgeIsCurrentFolder, getWorkTreeList } from '@/utils';
import { TreeItemKind, FolderItemConfig, APP_NAME } from '@/constants';

export class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    path: string;
    name: string;
    type = TreeItemKind.worktree;
    constructor(item: WorkTreeDetail, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.description = `${item.isMain ? '✨ ' : ''}${item.path}`;

        const isCurrent = judgeIsCurrentFolder(item.path);
        const themeColor = isCurrent ? new vscode.ThemeColor('charts.blue') : void 0;

        switch(true) {
            case item.prunable:
                this.iconPath = new vscode.ThemeIcon('error', themeColor);
                break;
            case item.locked:
                this.iconPath = new vscode.ThemeIcon('lock', themeColor);
                break;
            default:
                this.iconPath = getFolderIcon(item.path, themeColor);
                break;
        }
        let lockPost = !item.isMain && (item.locked ? '.lock' : '.unlock') || '';
        let mainPost = item.isMain ? '.main' : '';
        this.contextValue = `git-worktree-manager.worktreeItem${mainPost}${lockPost}`;

        this.path = item.path;
        this.name = item.name;

        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(`$(folder) 路径 ${item.path}\n\n`);
        this.tooltip.appendMarkdown(
            `$(${item.isBranch ? 'source-control' : 'git-commit'}) ${item.isBranch ? '分支' : '提交'}  ${
                item.name
            }\n\n`,
        );
        item.prunable && this.tooltip.appendMarkdown(`$(error) 已从 git 版本中分离`);
        item.locked && this.tooltip.appendMarkdown(`$(lock) 已锁定该 worktree, 防止被意外清除`);
        item.isMain && this.tooltip.appendMarkdown(`✨ worktree 主目录, 无法被清除和锁定`);

        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };
    }
}

export class WorkTreeDataProvider implements vscode.TreeDataProvider<WorkTreeItem> {
    static id = 'git-worktree-manager-list';
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

export class GitFolderItem extends vscode.TreeItem {
    type = TreeItemKind.gitFolder;
    name: string;
    path: string;
    constructor(item: FolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.name = item.name;
        this.path = item.path;
    }
}

type CommonWorkTreeItem = GitFolderItem | WorkTreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorkTreeItem> {
    static id = 'git-worktree-manager-folders';
    private data: FolderItemConfig[] = [];
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if(event.affectsConfiguration(APP_NAME)) {
                   this.refresh();
                }
            }),
            updateFolderEvent.event(() => {
                this.refresh();
            })
        );
        this.refresh();
    }

    refresh() {
        this.data = vscode.workspace.getConfiguration(APP_NAME).get<FolderItemConfig[]>('gitFolders') || [];
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: CommonWorkTreeItem | undefined): vscode.ProviderResult<CommonWorkTreeItem[]> {
        if(!element) {
            return this.data.map(item => {
                return new GitFolderItem(item, vscode.TreeItemCollapsibleState.Collapsed);
            });
        }
        if(element.type === TreeItemKind.gitFolder) {
            return getWorkTreeList(element.path).map(item => {
                return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None);
            });
        }
    }
    getTreeItem(element: CommonWorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
}
