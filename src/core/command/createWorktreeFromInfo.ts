import * as vscode from 'vscode';
import { addWorktree } from '@/core/git/addWorktree';
import { getMainFolder } from '@/core/git/getMainFolder';
import { confirmModal } from '@/core/ui/modal';
import { copyWorktreeFiles } from '@/core/util/copyWorktreeFiles';
import { postCreateWorktree } from '@/core/util/postCreateWorktree';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';
import type { ICreateWorktreeInfo } from '@/types';

export async function createWorktreeFromInfo(info: ICreateWorktreeInfo) {
    const { folderPath, name, label, isBranch, cwd } = info;
    let confirmCreate = await confirmModal(
        vscode.l10n.t('Create worktree'),
        vscode.l10n.t('Create'),
        vscode.l10n.t('A worktree for {label} {name} will be created under {folder}', {
            folder: folderPath,
            label,
            name,
        }),
    );
    if (!confirmCreate) {
        return;
    }

    const waitingCreate = withResolvers<void>();
    actionProgressWrapper(
        vscode.l10n.t('Creating worktree {path}', { path: folderPath }),
        () => waitingCreate.promise,
        () => {},
    );
    let created = await addWorktree(folderPath, name, isBranch, cwd);
    waitingCreate.resolve();
    if (!created) {
        return;
    }

    const mainFolder = await getMainFolder(folderPath);
    // Copy files after worktree creation is successful
    if (mainFolder) {
        await copyWorktreeFiles(mainFolder, folderPath);
    }

    await postCreateWorktree({
        worktreePath: folderPath,
        basePath: mainFolder,
    });

    let confirmOpen = await confirmModal(
        vscode.l10n.t('Open folder'),
        vscode.l10n.t('Open'),
        vscode.l10n.t('Open the new worktree in a new window?'),
    );
    if (!confirmOpen) {
        return;
    }
    let folderUri = vscode.Uri.file(folderPath);
    vscode.commands.executeCommand('vscode.openFolder', folderUri, {
        forceNewWindow: true,
    });
}
