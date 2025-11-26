import * as vscode from 'vscode';
import { ViewId, Commands, RecentItemType } from '@/constants';
import { globalStateEvent, updateFavoriteEvent } from '@/core/event/events';
import throttle from 'lodash-es/throttle';
import { IRecentItem, IWorktreeLess } from '@/types';
import { FolderItem, FileItem } from '@/core/treeView/items';
import { getFavoriteCache } from '@/core/util/cache';
import logger from '@/core/log/logger';
import path from 'path';

type FavoriteItem = FolderItem | FileItem;

export class FavoriteDataProvider implements vscode.TreeDataProvider<FavoriteItem>, vscode.Disposable {
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
            updateFavoriteEvent.event(this.refresh),
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

    async getChildren(element?: FavoriteItem): Promise<FavoriteItem[]> {
        try {
            return this.data
                .sort((a, b) => {
                    return a.label.localeCompare(b.label);
                })
                .map((item) => {
                    if (item.type === RecentItemType.file) {
                        return new FileItem(item.label, vscode.TreeItemCollapsibleState.None, item, ViewId.favorite);
                    } else {
                        return new FolderItem(item.label, vscode.TreeItemCollapsibleState.None, item, ViewId.favorite);
                    }
                });
        } catch (error) {
            logger.error(`Failed to get children:${error}`);
            return [];
        }
    }

    getTreeItem(element: FavoriteItem): vscode.TreeItem {
        return element;
    }

    getParent(): vscode.ProviderResult<FavoriteItem> {
        return void 0;
    }
}

export class FavoriteAndDropController implements vscode.TreeDragAndDropController<IWorktreeLess> {
    readonly dropMimeTypes = ['text/uri-list'];
    readonly dragMimeTypes = [];

    async handleDrop(
        target: IWorktreeLess | undefined,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken,
    ): Promise<void> {
        const item = dataTransfer.get('text/uri-list');
        if (!item) return;

        const uriList = await item.asString();
        const uris = uriList
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => vscode.Uri.parse(line));

        for (const uri of uris) {
            await this.processToFavorite(uri);
        }
    }

    async processToFavorite(uri: vscode.Uri) {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type & vscode.FileType.Directory) {
            vscode.commands.executeCommand(Commands.addToFavorite, this.createItem(uri, RecentItemType.folder));
        } else if (stat.type & vscode.FileType.File) {
            vscode.commands.executeCommand(Commands.addToFavorite, this.createItem(uri, RecentItemType.file));
        }
    }

    createItem(uri: vscode.Uri, type: RecentItemType): IWorktreeLess {
        const label = path.basename(uri.fsPath);
        const viewItem: IWorktreeLess = {
            fsPath: uri.fsPath,
            name: label,
            uriPath: uri.toString(),
            item: {
                label,
                path: uri.toString(),
                type,
            },
        };
        return viewItem;
    }
}
