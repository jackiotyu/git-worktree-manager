import * as vscode from 'vscode';
import fs from 'fs/promises';
import { Alert } from '@/core/ui/message';

export const checkExist = (path: string) => {
    return fs
        .stat(path)
        .then(() => true)
        .catch(() => false);
};

export const verifyFileExistence = async (fsPath: string): Promise<boolean> => {
    let exist = await checkExist(fsPath);
    if (!exist) {
        Alert.showErrorMessage(vscode.l10n.t('The file does not exist'), { modal: true });
        return false;
    }
    return true;
};

export const verifyDirExistence = async (fsPath: string): Promise<boolean> => {
    let exist = await checkExist(fsPath);
    if (!exist) {
        Alert.showErrorMessage(vscode.l10n.t('The folder does not exist'), { modal: true });
        return false;
    }
    let isFolder = await checkIsFolder(fsPath);
    if (!isFolder) {
        Alert.showErrorMessage(vscode.l10n.t('The path is not a folder'), { modal: true });
        return false;
    }
    return true;
};

export const checkIsFolder = (path: string): Promise<boolean> => {
    return fs.stat(path).then(stat => stat.isDirectory()).catch(() => false);
};

export function isDirEmpty(path: string): Promise<boolean> {
    return fs
        .readdir(path)
        .then((res) => res.length === 0)
        .catch(() => true);
}
