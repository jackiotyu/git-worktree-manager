import * as vscode from 'vscode';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { Alert } from '@/core/ui/message';
import { worktreeEventRegister } from '@/core/event/git';
import { confirmModal } from '@/core/ui/modal';
import { GitFolderItem } from '@/core/treeView/items';
import { comparePath } from '@/core/util/folder';

export const removeGitFolderCmd = async (item: GitFolderItem) => {
    let path = item.path;
    let folders = getFolderConfig();
    if (!folders.some((f) => comparePath(f.path, path))) {
        return;
    }
    let ok = await confirmModal(
        vscode.l10n.t('Remove the git repository reference in list'),
        vscode.l10n.t(
            'Are you sure to delete this repository reference with path {0} and alias {1}?',
            item.path,
            item.name,
        ),
    );
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => !comparePath(f.path, path));
    await updateFolderConfig(folders);
    worktreeEventRegister.remove(vscode.Uri.file(path));
    Alert.showInformationMessage(vscode.l10n.t('Remove successfully'));
};
