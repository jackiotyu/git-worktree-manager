import * as vscode from 'vscode';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';
import { Alert } from '@/core/ui/message';
import { confirmModal } from '@/core/ui/modal';
import { IWorktreeLess } from '@/types';
import { comparePath } from '@/core/util/folder';

export const removeFavoriteCmd = async (item: IWorktreeLess) => {
    const uriPath = item.uriPath;
    let folders = getFavoriteCache();
    if (!folders.some((f) => comparePath(f.path, uriPath))) {
        return;
    }
    const ok = await confirmModal(vscode.l10n.t('Remove items from the list'), vscode.l10n.t('Remove'), item.fsPath);
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => !comparePath(f.path, uriPath));
    await updateFavoriteCache(folders);
    Alert.showInformationMessage(vscode.l10n.t('Removed successfully'));
};
