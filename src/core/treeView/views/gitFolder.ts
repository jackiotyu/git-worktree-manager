import * as vscode from 'vscode';
import { IFolderItemConfig } from '@/types';
import { GlobalState } from '@/core/state';
import { TreeItemKind, ViewId } from '@/constants';
import { GitFolderItem, WorkTreeItem } from '@/core/treeView/items';
import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import { treeDataEvent, updateFolderEvent, globalStateEvent, toggleGitFolderViewAsEvent } from '@/core/event/events';
import { getWorkTreeList } from '@/core/git/getWorkTreeList';

type CommonWorkTreeItem = GitFolderItem | WorkTreeItem;

export class GitFoldersDataProvider implements vscode.TreeDataProvider<CommonWorkTreeItem>, vscode.Disposable {
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

    async getChildren(element?: CommonWorkTreeItem | undefined): Promise<CommonWorkTreeItem[] | undefined> {
        if (!element) {
            // TODO 使用worktreeEvent刷新数据
            if (!this.viewAsTree) {
                let itemList = await Promise.all(
                    this.data.map(async (item) => {
                        let list = await getWorkTreeList(item.path);
                        return [list, item] as const;
                    }),
                );
                let list = itemList.map(([list, config]) => {
                    return list.map((row) => {
                        return new WorkTreeItem(
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
            let list = await getWorkTreeList(element.path, !loaded);
            if (!loaded) {
                this.loadedMap.set(element.path, true);
                setImmediate(() => {
                    this._onDidChangeTreeData.fire(element);
                });
            }
            return Promise.resolve(
                list.map((item) => {
                    return new WorkTreeItem(item, vscode.TreeItemCollapsibleState.None, element);
                }),
            );
        }
    }
    getTreeItem(element: CommonWorkTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getParent(element: CommonWorkTreeItem): vscode.ProviderResult<CommonWorkTreeItem> {
        return element.parent as GitFolderItem;
    }
}
