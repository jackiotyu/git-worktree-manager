import * as vscode from 'vscode';
import { checkFolderExist } from '@/core/util/file';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { comparePath } from '@/core/util/folder';
import { checkGitValid } from '@/core/git/checkGitValid';
import { getMainFolder } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';
import { worktreeEventRegister } from '@/core/event/git';
import path from 'path';

export const addToGitFolder = async (folderPath: string) => {
    if (!(await checkFolderExist(folderPath))) {
        return;
    }
    let existFolders = getFolderConfig();
    if (!(await checkGitValid(folderPath))) {
        return Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
    }
    folderPath = await getMainFolder(folderPath);
    if (existFolders.some((i) => comparePath(i.path, folderPath))) {
        return Alert.showErrorMessage(vscode.l10n.t('The git repository folder already exists in the settings'));
    }
    let folderName = await vscode.window.showInputBox({
        title: vscode.l10n.t('Enter the name of the repository for the showcase'),
        placeHolder: vscode.l10n.t('Please enter a name for the presentation'),
        value: folderPath,
        valueSelection: [0, folderPath.length - path.basename(folderPath).length],
        validateInput: (value) => {
            if (!value) {
                return vscode.l10n.t('Please enter a name for the presentation');
            }
        },
    });
    if (!folderName) {
        return;
    }
    existFolders.push({ name: folderName, path: folderPath });
    await updateFolderConfig(existFolders);
    worktreeEventRegister.add(vscode.Uri.file(folderPath));
    Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
};
