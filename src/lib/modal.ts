import * as vscode from 'vscode';
import localize from '@/localize';

export const confirmModal = async (title: string, detail?: string) => {
    const ok = localize('ok');
    let confirm = await vscode.window.showWarningMessage(title, { modal: true, detail }, ok);
    return confirm === ok;
};
