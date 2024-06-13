import * as vscode from 'vscode';
import { Commands, ViewId } from '@/constants';
import { updateRecentEvent, loadAllTreeDataEvent } from '@/core/event/events';
import throttle from 'lodash/throttle';
import { IRecentFolderConfig, IRecentUriCache } from '@/types';
import { FolderLoadMore, FolderItem } from '@/core/treeView/items';
import path from 'path';
import { updateRecentFolders, getRecentFolderCache } from '@/core/util/cache';

type RecentFolderItem = FolderLoadMore | FolderItem;

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<RecentFolderItem> {
    static readonly id = ViewId.folderList;
    private pageNo = 1;
    private pageSize = 20;
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    private data: IRecentUriCache = getRecentFolderCache();
    public readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, 1000, { leading: true, trailing: true });
        this.initializeEventListeners(context);
        this.checkRecentFolderCache();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            updateRecentEvent.event(this.updateRecentFolders),
            vscode.commands.registerCommand(Commands.loadMoreRecentFolder, this.loadMoreFolder),
            loadAllTreeDataEvent.event(this.loadAllCheck),
        );
    }

    private checkRecentFolderCache() {
        if (+new Date() - this.data.time > 5000) this.updateRecentFolders();
    }

    private updateRecentFolders = async () => {
        await updateRecentFolders();
        this.refresh();
    };

    private refresh = () => {
        this.data = getRecentFolderCache();
        this._onDidChangeTreeData.fire();
    };

    private loadAllCheck = (viewId: ViewId) => {
        if (viewId === RecentFoldersDataProvider.id) {
            this.pageSize = Infinity;
            this.refresh();
        }
    };

    private loadMoreFolder = () => {
        this.pageNo += 1;
        this.refresh();
    };

    async getChildren(element?: RecentFolderItem): Promise<RecentFolderItem[]> {
        let itemList = this.data.list
            .slice(0, this.pageNo * this.pageSize)
            .map<IRecentFolderConfig>((item) => {
                return {
                    name: path.basename(item.fsPath),
                    path: item.fsPath,
                    uri: item,
                };
            })
            .map<RecentFolderItem>((item) => {
                return new FolderItem(item.name, vscode.TreeItemCollapsibleState.None, item);
            });
        if (itemList.length < this.data.list.length) {
            itemList.push(new FolderLoadMore());
        }
        return itemList;
    }

    getTreeItem(element: RecentFolderItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getParent(element: RecentFolderItem): vscode.ProviderResult<RecentFolderItem> {
        return void 0;
    }
}
