import * as vscode from 'vscode';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { worktreeEventRegister } from '@/core/event/git';
import { confirmModal } from '@/core/ui/modal';
import { IWorktreeLess } from '@/types';
import { comparePath } from '@/core/util/folder';

export const removeGitFolderCmd = async (item: IWorktreeLess) => {
    let fsPath = item.fsPath;
    let folders = getFolderConfig();
    if (!folders.some((f) => comparePath(f.path, fsPath))) {
        return;
    }
    let ok = await confirmModal(
        vscode.l10n.t('Remove the git repository reference from the list'),
        vscode.l10n.t(
            'Are you sure to delete this repository reference with path {0} and alias {1}?',
            item.fsPath,
            item.name,
        ),
    );
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => !comparePath(f.path, fsPath));
    await updateFolderConfig(folders);
    worktreeEventRegister.remove(vscode.Uri.file(fsPath));
    Alert.showInformationMessage(vscode.l10n.t('Remove successfully'));
};
