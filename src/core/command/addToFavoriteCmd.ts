import * as vscode from 'vscode';
import { FolderItem } from '@/core/treeView/items';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';

export const addToFavoriteCmd = async (viewItem?: FolderItem) => {
    if (!viewItem?.item) return;
    const favorite = getFavoriteCache();
    if (favorite.every(row => vscode.Uri.parse(row.path).toString() !== vscode.Uri.parse(viewItem.uriPath).toString())) {
        favorite.push(viewItem.item);
        updateFavoriteCache(favorite);
    }
};