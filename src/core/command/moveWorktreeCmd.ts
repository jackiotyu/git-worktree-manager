import * as vscode from 'vscode';
import { WorktreeItem } from '@/core/treeView/items';
import { moveWorktree } from '@/core/git/moveWorktree';
import { getMainFolder, clearMainFolderCache } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';
import { replaceGroupedWorktreePath } from '@/core/util/worktreeGroup';

export const moveWorktreeCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    try {
        const mainFolder = await getMainFolder(item.fsPath);
        if (!mainFolder) return false;
        const folderPath = await inputWorktreeDir({
            baseDir: mainFolder,
            targetDirTip: vscode.l10n.t('Select the new location to move the worktree folder from {0}', item.fsPath),
        });
        if (!folderPath) return;
        await moveWorktree(item.fsPath, folderPath, mainFolder);
        try {
            await replaceGroupedWorktreePath(item.fsPath, folderPath);
        } catch (error) {
            logger.error(`Failed to update the worktree group after moving: ${String(error)}`);
        }
        clearMainFolderCache(item.fsPath);
        clearMainFolderCache(folderPath);
        Alert.showInformationMessage(vscode.l10n.t('Worktree moved successfully'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree move failed \n\n {0}', String(error)));
        logger.error(error);
    }
};
