import * as vscode from 'vscode';
import { Alert } from '@/core/ui/message';
import { toSimplePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { worktreeEventRegister } from '@/core/event/git';
import { pickMultiFolder } from '@/core/ui/pickGitFolder';

export const addDirsToRepo = async (dirs: string[]) => {
    const folders = await Promise.all(
        dirs.map(async (filePath) => {
            try {
                return toSimplePath(await getMainFolder(filePath));
            } catch {
                return null;
            }
        }),
    );
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
