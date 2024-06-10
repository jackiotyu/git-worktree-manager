import * as vscode from "vscode";
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { GitFolderItem } from '@/core/treeView/items';

const pickFolderConfig = (item?: GitFolderItem) => {
    if (!item) return;
    return getFolderConfig().find((row) => row.path === item.path);
};

export const renameGitFolderCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    let folder = pickFolderConfig(item);
    if (!folder) {
        return;
    }
    const path = folder.path;
    let name = await vscode.window.showInputBox({
        title: vscode.l10n.t('Rename the git repository alias'),
        placeHolder: vscode.l10n.t('Enter the name of the repository for the showcase'),
        value: folder.name,
        validateInput(value) {
            if (!value) {
                return vscode.l10n.t('Enter the name of the repository for the showcase');
            }
        },
    });
    if (!name) {
        return;
    }
    folder.name = name;
    let allFolders = getFolderConfig();
    let index = allFolders.findIndex((i) => i.path === path);
    if (~index) {
        allFolders[index].name = name;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
    }
};