import * as vscode from 'vscode';
import { Alert } from '@/lib/adaptor/window';

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
            } catch (error: any) {
                Alert.showErrorMessage(error.message);
            } finally {
                callback();
                progress.report({ increment: 100 });
            }
        },
    );
};
