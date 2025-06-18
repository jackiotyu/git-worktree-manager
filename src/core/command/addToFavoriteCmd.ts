import * as vscode from 'vscode';
import { FolderItem } from '@/core/treeView/items';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';

export const addToFavoriteCmd = async (viewItem?: FolderItem) => {
    if (!viewItem) return;
    const favorite = getFavoriteCache();
    const item = viewItem.item;
    if (favorite.every(row => vscode.Uri.parse(row.path).toString() !== vscode.Uri.parse(item.path).toString())) {
        favorite.push(item);
        updateFavoriteCache(favorite);
    }
};