import * as vscode from 'vscode';
import { getNestedRepos, updateNestedRepos } from '@/core/util/nestedRepo';
import { comparePath } from '@/core/util/folder';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import { treeDataEvent } from '@/core/event/events';
import type { WorkspaceMainGitFolderItem } from '@/core/treeView/items';

export const removeNestedRepoCmd = async (item: WorkspaceMainGitFolderItem) => {
    const fsPath = item.fsPath;
    const ok = await confirmModal(
        vscode.l10n.t('Remove nested Git repository from workspace'),
        vscode.l10n.t('Remove'),
        vscode.l10n.t('Are you sure you want to remove the nested Git repository {0} from the workspace view?', fsPath),
    );
    if (!ok) return;
    await updateNestedRepos(getNestedRepos().filter((repo) => !comparePath(repo, fsPath)));
    treeDataEvent.fire();
    Alert.showInformationMessage(vscode.l10n.t('Removed successfully'));
};
