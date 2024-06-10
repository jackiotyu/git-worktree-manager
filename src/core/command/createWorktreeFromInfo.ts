import * as vscode from 'vscode';
import { addWorktree } from '@/core/git/addWorktree';
import { confirmModal } from '@/core/ui/modal';

export const createWorktreeFromInfo = async (info: {
    folderPath: string;
    name: string;
    label: string;
    isBranch: boolean;
    cwd?: string;
}) => {
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
};