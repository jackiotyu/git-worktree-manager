import * as vscode from 'vscode';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { GitFolderItem } from '@/core/treeView/items';
import path from 'path';

const pickFolderConfig = (item?: GitFolderItem) => {
    if (!item) return;
    return getFolderConfig().find((row) => row.path === item.path);
};

export const renameGitFolderCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    let folder = pickFolderConfig(item);
    if (!folder) return;
    const folderName = folder.name;
    const baseName = path.basename(folderName);
    const valueSelection: [number, number] =
        baseName === folderName ? [0, folderName.length] : [0, folderName.length - baseName.length];
    let name = await vscode.window.showInputBox({
        title: vscode.l10n.t('Rename the git repository alias'),
        placeHolder: vscode.l10n.t('Enter the name of the repository for the showcase'),
        value: folderName,
        valueSelection: valueSelection,
        validateInput(value) {
            if (!value) {
                return vscode.l10n.t('Enter the name of the repository for the showcase');
            }
        },
    });
    if (!name) return;
    folder.name = name;
    let allFolders = getFolderConfig();
    const folderPath = folder.path;
    let index = allFolders.findIndex((i) => i.path === folderPath);
    if (~index) {
        allFolders[index].name = name;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
    }
};
