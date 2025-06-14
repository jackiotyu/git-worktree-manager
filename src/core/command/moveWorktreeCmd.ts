import * as vscode from 'vscode';
import { WorktreeItem } from '@/core/treeView/items';
import { moveWorktree } from '@/core/git/moveWorktree';
import { getMainFolder } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';

export const moveWorktreeCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    try {
        const mainFolder = await getMainFolder(item.path);
        if (!mainFolder) return false;
        let folderPath = await inputWorktreeDir({
            baseDir: mainFolder,
            targetDirTip: vscode.l10n.t(`Select the new location to move the Worktree's folder from {0}`, item.path),
        });
        if (!folderPath) return;
        await moveWorktree(item.path, folderPath, item.path);
        Alert.showInformationMessage(vscode.l10n.t('Worktree moved successfully'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree move failed \n\n {0}', String(error)));
        logger.error(error);
    }
};
