import * as vscode from 'vscode';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { confirmModal } from '@/core/ui/modal';
import { toSimplePath } from '@/core/util/folder';
import { IFolderItemConfig } from '@/types';

export const removeMultiGitFolderCmd = async () => {
    const items: (vscode.QuickPickItem & { description: string })[] = getFolderConfig().map((item) => {
        return {
            iconPath: vscode.ThemeIcon.Folder,
            label: item.name,
            description: item.path,
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
        selected.map((item) => item.description!).join('\n'),
    );
    if (!confirm) return;

    const selectedSet = new Set(selected.map((item) => toSimplePath(item.description)));
    const updateList: IFolderItemConfig[] = [];
    const currentList = getFolderConfig();
    currentList.forEach((item) => {
        if (selectedSet.has(toSimplePath(item.path))) return;
        updateList.push(item);
    });
    updateFolderConfig(updateList);
    Alert.showInformationMessage(vscode.l10n.t('Remove successfully'));
};
