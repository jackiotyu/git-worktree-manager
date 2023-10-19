import * as vscode from 'vscode';

export const actionProgressWrapper = (title: string, action: () => Promise<any>, callback: () => any) => {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title,
        },
        async (progress, token) => {
            try {
                await action();
            } finally {
                callback();
                progress.report({ increment: 100 });
            }
        },
    );
};
