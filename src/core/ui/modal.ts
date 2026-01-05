import * as vscode from 'vscode';

export const confirmModal = async (title: string, confirmText: string, detail?: string) => {
    const confirm = await vscode.window.showWarningMessage(title, { modal: true, detail }, confirmText);
    return confirm === confirmText;
};
