import * as vscode from "vscode";
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';

export const copyFilePathCmd = (item?: IWorktreeLess) => {
    if (!item) return;
    vscode.env.clipboard.writeText(item.fsPath).then(() => {
        Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', item.fsPath));
    });
};