import * as vscode from 'vscode';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';
import { Alert } from '@/core/ui/message';
import { confirmModal } from '@/core/ui/modal';
import { FolderItem } from '@/core/treeView/items';
import { comparePath } from '@/core/util/folder';

export const removeFavoriteCmd = async (item: FolderItem) => {
    let uriPath = item.uriPath;
    let folders = getFavoriteCache();
    if (!folders.some((f) => comparePath(f.path, uriPath))) {
        return;
    }
    let ok = await confirmModal(
        vscode.l10n.t('Remove the items from the list'),
        item.label as string,
    );
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => !comparePath(f.path, uriPath));
    await updateFavoriteCache(folders);
    Alert.showInformationMessage(vscode.l10n.t('Remove successfully'));
};
