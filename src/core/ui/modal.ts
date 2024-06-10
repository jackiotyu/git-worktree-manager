import * as vscode from 'vscode';

export const confirmModal = async (title: string, detail?: string) => {
    const ok = vscode.l10n.t('ok');
    let confirm = await vscode.window.showWarningMessage(title, { modal: true, detail }, ok);
    return confirm === ok;
};
