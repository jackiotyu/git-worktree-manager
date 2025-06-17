import * as vscode from 'vscode';
import { FolderItem } from '@/core/treeView/items';
import { GlobalState } from '@/core/state';

export const addToFavoriteCmd = async (viewItem?: FolderItem) => {
    if (!viewItem) return;
    const favorite = GlobalState.get('global.favorite', []);
    const item = viewItem.item;
    if (favorite.every(row => vscode.Uri.parse(row.path).toString() !== vscode.Uri.parse(item.path).toString())) {
        favorite.push(item);
        GlobalState.update('global.favorite', favorite);
    }
};