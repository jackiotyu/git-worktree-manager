import * as vscode from 'vscode';
import { Alert } from '@/core/ui/message';
import { toSimplePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { worktreeEventRegister } from '@/core/event/git';
import { pickMultiFolder } from '@/core/ui/pickGitFolder';
import { withResolvers } from '@/core/util/promise';

const withProgress = () => {
    const loading = withResolvers<void>();
    const cancelTokenSource = new vscode.CancellationTokenSource();
    cancelTokenSource.token.onCancellationRequested(loading.resolve);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Searching folders'),
            cancellable: true,
        },
        async (progress, token) => {
            progress.report({ message: vscode.l10n.t('Loading...') });
            token.onCancellationRequested(cancelTokenSource.cancel.bind(cancelTokenSource));
            await loading.promise.catch(() => {});
            progress.report({ increment: 100 });
            cancelTokenSource.dispose();
        }
    );
    return { endLoading: loading.resolve, cancelToken: cancelTokenSource.token };
};

export const addDirsToRepo = async (dirs: string[]) => {
    const { endLoading, cancelToken } = withProgress();
    const folders = await Promise.all(
        dirs.map(async (filePath) => {
            try {
                if (cancelToken.isCancellationRequested) return null;
                return toSimplePath(await getMainFolder(filePath));
            } catch {
                return null;
            }
        })
    );
    endLoading();

    const distinctFolders = [...new Set(folders.filter((i) => i))];
    if (!distinctFolders.length) {
        Alert.showErrorMessage(vscode.l10n.t('There are no folders to add'));
        return;
    }
    const existFolders = getFolderConfig();
    const existFoldersMap = new Map(existFolders.map((i) => [toSimplePath(i.path), true]));
    const gitFolders = distinctFolders.filter((i) => i && !existFoldersMap.has(toSimplePath(i))) as string[];
    if (!gitFolders.length) {
        Alert.showErrorMessage(vscode.l10n.t('All folders have been added, there are no more folders to add'));
        return;
    }
    const selectGitFolders = await pickMultiFolder(gitFolders);
    if (!selectGitFolders || !selectGitFolders.length) return;
    const newFolders = getFolderConfig();
    newFolders.push(...selectGitFolders);
    await updateFolderConfig(newFolders);
    selectGitFolders.forEach((item) => worktreeEventRegister.add(vscode.Uri.file(item.path)));
    Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
};
