import * as vscode from 'vscode';
import { IWorktreeLess } from '@/types';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';

export const addToFavoriteCmd = async (viewItem?: IWorktreeLess) => {
    if (!viewItem?.item) return;
    const favorite = getFavoriteCache();
    if (
        favorite.every((row) => vscode.Uri.parse(row.path).toString() !== vscode.Uri.parse(viewItem.uriPath).toString())
    ) {
        favorite.push(viewItem.item);
        updateFavoriteCache(favorite);
    }
};
