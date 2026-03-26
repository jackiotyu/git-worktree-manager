import * as vscode from 'vscode';
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';
import { toSimplePath } from '@/core/util/path';

export const copyFilePathCmd = (item?: IWorktreeLess) => {
    if (!item) return;
    const folderPath = toSimplePath(item.fsPath);
    vscode.env.clipboard.writeText(folderPath).then(() => {
        Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', folderPath));
    });
};
