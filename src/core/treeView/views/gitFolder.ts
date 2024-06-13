import * as vscode from 'vscode';
import { IFolderItemConfig } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ViewId, ContextKey } from '@/constants';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import { treeDataEvent, updateFolderEvent, globalStateEvent, toggleGitFolderViewAsEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';

type CommonWorktreeItem = GitFolderItem | WorktreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorktreeItem>, vscode.Disposable {
    static readonly id = ViewId.gitFolderList;
    private data: IFolderItemConfig[] = [];
    private viewAsTree: boolean = true;
    private loadedMap: Map<string, boolean> = new Map();
    private _onDidChangeTreeData = new vscode.EventEmitter<GitFolderItem | void>();
    public readonly onDidChangeTreeData: vscode.Event<GitFolderItem | void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1500, { leading: true, trailing: true });
        this.initializeEventListeners(context);
        this.initializeViewState();
    }

    dispose() {
        this.loadedMap.clear();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            globalStateEvent.event((key) => {
                if (key === 'gitFolders') this.refresh();
            }),
            treeDataEvent.event(() => process.nextTick(this.refresh)),
            updateFolderEvent.event(this.refresh),
            toggleGitFolderViewAsEvent.event(
                debounce((viewAsTree: boolean) => {
                    this.viewAsTree = viewAsTree;
                    vscode.commands.executeCommand('setContext', ContextKey.gitFolderViewAsTree, viewAsTree);
                    GlobalState.update('gitFolderViewAsTree', viewAsTree);
                }, 300),
            ),
            this,
        );
    }

    private initializeViewState() {
        this.viewAsTree = GlobalState.get('gitFolderViewAsTree', true);
        queueMicrotask(() => {
            vscode.commands.executeCommand('setContext', ContextKey.gitFolderViewAsTree, this.viewAsTree);
        });
    }

    private refresh = () => {
        this.data = GlobalState.get('gitFolders', []);
        this.data.sort((a, b) => a.name.localeCompare(b.name));
        this._onDidChangeTreeData.fire();
    };

    async getChildren(element?: CommonWorktreeItem | undefined): Promise<CommonWorktreeItem[] | undefined> {
        if (!element) {
            // TODO 使用worktreeEvent刷新数据
            if (!this.viewAsTree) {
                const worktreeItems = await Promise.all(
                    this.data.map(async (item) => {
                        const worktrees = await getWorktreeList(item.path);
                        return worktrees.map(
                            (row) =>
                                new WorktreeItem(
                                    { ...row, folderName: item.name },
                                    vscode.TreeItemCollapsibleState.None,
                                ),
                        );
                    }),
                );
                return worktreeItems.flat();
            }
            return this.data.map(
                (item) =>
                    new GitFolderItem(
                        item,
                        item.defaultOpen
                            ? vscode.TreeItemCollapsibleState.Expanded
                            : vscode.TreeItemCollapsibleState.Collapsed,
                    ),
            );
        }

        if (element.type === TreeItemKind.gitFolder) {
            // 延迟获取pull/push提交数
            const loaded = this.loadedMap.has(element.path);
            const worktreeList = await getWorktreeList(element.path, !loaded);
            if (!loaded) {
                this.loadedMap.set(element.path, true);
                setImmediate(() => this._onDidChangeTreeData.fire(element));
            }
            return worktreeList.map((item) => new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element));
        }
    }

    getTreeItem(element: CommonWorktreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getParent(element: CommonWorktreeItem): vscode.ProviderResult<CommonWorktreeItem> {
        return element.parent as GitFolderItem;
    }
}
