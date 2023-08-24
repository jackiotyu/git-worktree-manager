import * as vscode from 'vscode';

export const confirmModal = async (title: string, detail?: string) => {
    const ok = '确认';
    let confirm = await vscode.window.showWarningMessage(title, { modal: true, detail }, ok);
    return confirm === ok;
};
