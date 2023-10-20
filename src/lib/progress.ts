import * as vscode from 'vscode';
import { Alert } from '@/lib/adaptor/window';

export const actionProgressWrapper = (title: string, action: () => Promise<any>, callback: () => any, cancelToken?: vscode.CancellationTokenSource) => {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            cancellable: !!cancelToken,
            title,
        },
        async (progress, token) => {
            cancelToken && token.onCancellationRequested(cancelToken.cancel.bind(cancelToken));
            try {
                await action();
            } catch (error: any) {
                Alert.showErrorMessage(error.message);
            } finally {
                callback();
                cancelToken?.dispose();
                progress.report({ increment: 100 });
            }
        },
    );
};
