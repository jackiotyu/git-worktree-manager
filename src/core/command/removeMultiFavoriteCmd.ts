import * as vscode from 'vscode';
import { getFavoriteCache, updateFavoriteCache } from '@/core/util/cache';
import { Alert } from '@/core/ui/message';
import { confirmModal } from '@/core/ui/modal';
import { toSimplePath, getRecentItemIcon } from '@/core/util/folder';
import { IRecentItem } from '@/types';

export const removeMultiFavoriteCmd = async () => {
    const items: (vscode.QuickPickItem & { description: string; path: string })[] = getFavoriteCache().map((item) => {
        const uri = vscode.Uri.parse(item.path);
        return {
            iconPath: getRecentItemIcon(item.type),
            label: item.label,
            description: uri.fsPath,
            path: item.path,
        };
    });
    const selected = await vscode.window.showQuickPick(items, {
        title: vscode.l10n.t('Please select the items you want to remove'),
        matchOnDetail: true,
        canPickMany: true,
    });

    if (!selected?.length) return;

    const confirm = await confirmModal(
        vscode.l10n.t('The selected items will be removed from the list'),
        vscode.l10n.t('Remove'),
        selected.map((item) => item.description!).join('\n'),
    );
    if (!confirm) return;

    const selectedSet = new Set(selected.map((item) => toSimplePath(item.path)));
    const updateList: IRecentItem[] = [];
    const currentList = getFavoriteCache();
    currentList.forEach((item) => {
        if (selectedSet.has(toSimplePath(item.path))) return;
        updateList.push(item);
    });
    updateFavoriteCache(updateList);
    Alert.showInformationMessage(vscode.l10n.t('Removed successfully'));
};
