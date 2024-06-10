import * as vscode from 'vscode';
import { IFolderItemConfig } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ViewId } from '@/constants';
import { GitFolderItem, WorktreeItem } from '@/core/treeView/items';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import { treeDataEvent, updateFolderEvent, globalStateEvent, toggleGitFolderViewAsEvent } from '@/core/event/events';
import { getWorktreeList } from '@/core/git/getWorktreeList';

type CommonWorktreeItem = GitFolderItem | WorktreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorktreeItem>, vscode.Disposable {
    static readonly id = ViewId.gitFolderList;
    private data: IFolderItemConfig[] = [];
    private viewAsTree: boolean;
    private loadedMap: Map<string, boolean> = new Map();
    _onDidChangeTreeData = new vscode.EventEmitter<GitFolderItem | void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1500, { leading: true, trailing: true });
        context.subscriptions.push(
            globalStateEvent.event(this.refresh),
            treeDataEvent.event(() => process.nextTick(this.refresh)),
            updateFolderEvent.event(this.refresh),
            toggleGitFolderViewAsEvent.event(
                debounce((viewAsTree: boolean) => {
                    this.viewAsTree = viewAsTree;
                    vscode.commands.executeCommand(
                        'setContext',
                        'git-worktree-manager.gitFolderViewAsTree',
                        viewAsTree,
                    );
                    GlobalState.update('gitFolderViewAsTree', viewAsTree);
                }, 300),
            ),
            this,
        );
        let viewAsTree = GlobalState.get('gitFolderViewAsTree', true);
        vscode.commands.executeCommand('setContext', 'git-worktree-manager.gitFolderViewAsTree', viewAsTree);
        this.viewAsTree = viewAsTree;
    }

    dispose() {
        this.loadedMap.clear();
    }

    refresh = () => {
        this.data = GlobalState.get('gitFolders', []);
        this.data.sort((a, b) => a.name.localeCompare(b.name));
        this._onDidChangeTreeData.fire();
    };

    async getChildren(element?: CommonWorktreeItem | undefined): Promise<CommonWorktreeItem[] | undefined> {
        if (!element) {
            // TODO 使用worktreeEvent刷新数据
            if (!this.viewAsTree) {
                let itemList = await Promise.all(
                    this.data.map(async (item) => {
                        let list = await getWorktreeList(item.path);
                        return [list, item] as const;
                    }),
                );
                let list = itemList.map(([list, config]) => {
                    return list.map((row) => {
                        return new WorktreeItem(
                            { ...row, folderName: config.name },
                            vscode.TreeItemCollapsibleState.None,
                            element,
                        );
                    });
                });
                return Promise.resolve(list.flat());
            }
            return Promise.resolve(
                this.data.map((item) => {
                    return new GitFolderItem(
                        item,
                        item.defaultOpen
                            ? vscode.TreeItemCollapsibleState.Expanded
                            : vscode.TreeItemCollapsibleState.Collapsed,
                    );
                }),
            );
        }
        if (element.type === TreeItemKind.gitFolder) {
            // 延迟获取pull/push提交数
            const loaded = this.loadedMap.has(element.path);
            let list = await getWorktreeList(element.path, !loaded);
            if (!loaded) {
                this.loadedMap.set(element.path, true);
                setImmediate(() => {
                    this._onDidChangeTreeData.fire(element);
                });
            }
            return Promise.resolve(
                list.map((item) => {
                    return new WorktreeItem(item, vscode.TreeItemCollapsibleState.None, element);
                }),
            );
        }
    }
    getTreeItem(element: CommonWorktreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getParent(element: CommonWorktreeItem): vscode.ProviderResult<CommonWorktreeItem> {
        return element.parent as GitFolderItem;
    }
}
