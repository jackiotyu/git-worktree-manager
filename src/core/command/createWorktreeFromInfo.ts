import * as vscode from 'vscode';
import { addWorktree } from '@/core/git/addWorktree';
import { getMainFolder } from '@/core/git/getMainFolder';
import { confirmModal } from '@/core/ui/modal';
import { copyIgnoredFiles } from '@/core/util/copyIgnoredFiles';
import type { ICreateWorktreeInfo } from '@/types';

export async function createWorktreeFromInfo(info: ICreateWorktreeInfo) {
    const { folderPath, name, label, isBranch, cwd } = info;
    let confirmCreate = await confirmModal(
        vscode.l10n.t('Create worktree'),
        vscode.l10n.t('A worktree with {1} {2} is created under {0}', folderPath, label, name),
    );
    if (!confirmCreate) {
        return;
    }
    let created = await addWorktree(folderPath, name, isBranch, cwd);
    if (!created) {
        return;
    }

    const mainFolder = await getMainFolder(folderPath);
    // Copy files after worktree creation is successful
    if (mainFolder) {
        await copyIgnoredFiles(mainFolder, folderPath);
    }

    let confirmOpen = await confirmModal(
        vscode.l10n.t('Open folder'),
        vscode.l10n.t('Whether to open the new worktree in a new window?'),
    );
    if (!confirmOpen) {
        return;
    }
    let folderUri = vscode.Uri.file(folderPath);
    vscode.commands.executeCommand('vscode.openFolder', folderUri, {
        forceNewWindow: true,
    });
}
