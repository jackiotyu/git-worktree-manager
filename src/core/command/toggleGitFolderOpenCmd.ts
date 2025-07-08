import * as vscode from "vscode";
import { Alert } from '@/core/ui/message';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { IFolderItemConfig }  from '@/types';
import { GitFolderItem } from '@/core/treeView/items';
import { comparePath } from '@/core/util/folder';

async function updateFolderItem(config: IFolderItemConfig) {
    let allFolders = getFolderConfig();
    let index = allFolders.findIndex((i) => comparePath(i.path, config.path));
    if (~index) {
        allFolders[index] = config;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
    }
}

export const toggleGitFolderOpenCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    item.defaultOpen = !item.defaultOpen;
    await updateFolderItem({
        name: item.name,
        path: item.fsPath,
        defaultOpen: item.defaultOpen,
    });
};
