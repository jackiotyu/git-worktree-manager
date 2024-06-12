import * as vscode from 'vscode';
import { Commands, ViewId } from '@/constants';
import { updateRecentEvent, loadAllTreeDataEvent } from '@/core/event/events';
import throttle from 'lodash/throttle';
import { IRecentFolderConfig } from '@/types';
import { FolderLoadMore, FolderItem } from '@/core/treeView/items';
import { getRecentFolders } from '@/core/util/workspace';
import path from 'path';

type RecentFolderItem = FolderLoadMore | FolderItem;

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<RecentFolderItem> {
    static readonly id = ViewId.folderList;
    private pageNo = 1;
    private pageSize = 20;
    _onDidChangeTreeData = new vscode.EventEmitter<void>();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1000, { leading: true, trailing: true });
        context.subscriptions.push(
            updateRecentEvent.event(this.refresh),
            vscode.commands.registerCommand(Commands.loadMoreRecentFolder, this.loadMoreFolder),
            loadAllTreeDataEvent.event(this.loadAllCheck),
        );
        // HACK 强制获取一次最近的文件夹，加快访问速度
        queueMicrotask(() => {
            vscode.commands.executeCommand('_workbench.getRecentlyOpened');
        });
    }
    refresh = () => {
        this._onDidChangeTreeData.fire();
    };
    loadAllCheck = (viewId: ViewId) => {
        if (viewId === RecentFoldersDataProvider.id) {
            this.pageSize = Infinity;
            this.refresh();
        }
    };
    loadMoreFolder = () => {
        this.pageNo += 1;
        this.refresh();
    };
    async getChildren(element?: RecentFolderItem | undefined): Promise<RecentFolderItem[]> {
        let folders = await getRecentFolders();
        let itemList = folders
            .slice(0, this.pageNo * this.pageSize)
            .map<IRecentFolderConfig>((item) => {
                return {
                    name: item.label || path.basename(item.folderUri.fsPath),
                    path: item.folderUri.fsPath,
                    uri: item.folderUri,
                };
            })
            .map<RecentFolderItem>((item) => {
                return new FolderItem(item.name, vscode.TreeItemCollapsibleState.None, item);
            });
        if (itemList.length < folders.length) {
            itemList.push(new FolderLoadMore());
        }
        return itemList;
    }
    getTreeItem(element: FolderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getParent(element: RecentFolderItem): vscode.ProviderResult<RecentFolderItem> {
        return void 0;
    }
}
