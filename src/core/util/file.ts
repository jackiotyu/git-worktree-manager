import * as vscode from 'vscode';
import fs from 'fs/promises';
import { Alert } from '@/core/ui/message';

export const checkExist = (path: string) => {
    return fs
        .stat(path)
        .then(() => true)
        .catch(() => false);
};

export const verifyDirExistence = async (path: string) => {
    let exist = await checkExist(path);
    if (!exist) {
        Alert.showErrorMessage(vscode.l10n.t('The folder does not exist'), { modal: true });
        return false;
    }
    return true;
};