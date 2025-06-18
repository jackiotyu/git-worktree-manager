import * as vscode from 'vscode';
import { ViewId } from '@/constants';
import { globalStateEvent } from '@/core/event/events';
import throttle from 'lodash-es/throttle';
import { IRecentItem } from '@/types';
import { FolderItem } from '@/core/treeView/items';
import { getFavoriteCache } from '@/core/util/cache';
import logger from '@/core/log/logger';

export class FavoriteDataProvider implements vscode.TreeDataProvider<FolderItem>, vscode.Disposable {
    static readonly id = ViewId.favorite;
    private static readonly refreshThrottle = 1000; // 1s

    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    private data: IRecentItem[] = getFavoriteCache();
    public readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.refresh = throttle(this.refresh, FavoriteDataProvider.refreshThrottle, {
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
                if (e === 'global.favorite') this.refresh();
            }),
            this,
        );
    }

    private refresh = () => {
        try {
            this.data = getFavoriteCache();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            logger.error(`Failed to refresh recent folders:${error}`);
        }
    };

    async getChildren(element?: FolderItem): Promise<FolderItem[]> {
        try {
            return this.data.map(item => {
                return new FolderItem(item.label, vscode.TreeItemCollapsibleState.None, item, ViewId.favorite);
            });
        } catch (error) {
            logger.error(`Failed to get children:${error}`);
            return [];
        }
    }

    getTreeItem(element: FolderItem): vscode.TreeItem {
        return element;
    }

    getParent(): vscode.ProviderResult<FolderItem> {
        return void 0;
    }
}
