import * as vscode from 'vscode';
import { Commands, ViewId } from '@/constants';
import { loadAllTreeDataEvent, globalStateEvent } from '@/core/event/events';
import throttle from 'lodash-es/throttle';
import { IRecentItemCache } from '@/types';
import { FolderLoadMore, FolderItem } from '@/core/treeView/items';
import { getRecentItemCache } from '@/core/util/cache';
import logger from '@/core/log/logger';

type RecentFolderItem = FolderLoadMore | FolderItem;

export class RecentFoldersDataProvider implements vscode.TreeDataProvider<RecentFolderItem>, vscode.Disposable {
    static readonly id = ViewId.folderList;
    private static readonly defaultPageSize = 20;
    private static readonly refreshThrottle = 1000; // 1s

    private pageNo = 1;
    private pageSize = RecentFoldersDataProvider.defaultPageSize;
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    private data: IRecentItemCache = getRecentItemCache();
    public readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, RecentFoldersDataProvider.refreshThrottle, {
            leading: true,
            trailing: true,
        });
        this.initializeEventListeners(context);
    }

    dispose() {
        this._onDidChangeTreeData.dispose();
    }

    private initializeEventListeners(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            globalStateEvent.event((e) => {
                if (e === 'global.recentItemCache') this.refresh();
            }),
            vscode.commands.registerCommand(Commands.loadMoreRecentFolder, this.loadMoreFolder),
            loadAllTreeDataEvent.event(this.loadAllCheck),
            this,
        );
    }

    private refresh = () => {
        try {
            this.data = getRecentItemCache();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            logger.error(`Failed to refresh recent folders:${error}`);
        }
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
        try {
            const start = 0;
            const end = this.pageNo * this.pageSize;
            const currentItems = this.data.list.slice(start, end);

            const itemList: RecentFolderItem[] = currentItems
                .map((config) => {
                    return new FolderItem(config.label, vscode.TreeItemCollapsibleState.None, config, ViewId.folderList);
                });

            if (itemList.length < this.data.list.length) {
                itemList.push(new FolderLoadMore());
            }

            return itemList;
        } catch (error) {
            logger.error(`Failed to get children:${error}`);
            return [];
        }
    }

    getTreeItem(element: RecentFolderItem): vscode.TreeItem {
        return element;
    }

    getParent(): vscode.ProviderResult<RecentFolderItem> {
        return void 0;
    }
}
