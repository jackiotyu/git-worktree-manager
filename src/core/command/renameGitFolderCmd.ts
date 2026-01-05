import * as vscode from 'vscode';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';
import { comparePath } from '@/core/util/folder';
import path from 'path';

const pickFolderConfig = (item?: IWorktreeLess) => {
    if (!item) return;
    return getFolderConfig().find((row) => comparePath(row.path, item.fsPath));
};

export const renameGitFolderCmd = async (item?: IWorktreeLess) => {
    if (!item) return;
    const folder = pickFolderConfig(item);
    if (!folder) return;
    const folderName = folder.name;
    const baseName = path.basename(folderName);
    const valueSelection: [number, number] =
        baseName === folderName ? [0, folderName.length] : [0, folderName.length - baseName.length];
    const name = await vscode.window.showInputBox({
        title: vscode.l10n.t('Rename the Git repository alias'),
        placeHolder: vscode.l10n.t('Enter the repository name for display'),
        value: folderName,
        valueSelection: valueSelection,
        validateInput(value) {
            if (!value) {
                return vscode.l10n.t('Enter the repository name for display');
            }
        },
    });
    if (!name) return;
    folder.name = name;
    const allFolders = getFolderConfig();
    const folderPath = folder.path;
    const index = allFolders.findIndex((i) => comparePath(i.path, folderPath));
    if (~index) {
        allFolders[index].name = name;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
    }
};
