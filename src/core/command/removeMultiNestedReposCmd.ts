import * as vscode from 'vscode';
import path from 'path';
import { getNestedRepos, updateNestedRepos } from '@/core/util/nestedRepo';
import { toSimplePath } from '@/core/util/folder';
import { confirmModal } from '@/core/ui/modal';
import { Alert } from '@/core/ui/message';
import { treeDataEvent } from '@/core/event/events';

export const removeMultiNestedReposCmd = async () => {
    const iconPath = new vscode.ThemeIcon('repo');
    const repos = getNestedRepos();
    const items: vscode.QuickPickItem[] = repos.map((repo) => ({
        iconPath,
        label: path.basename(repo),
        description: repo,
    }));
    const selected = await vscode.window.showQuickPick(items, {
        title: vscode.l10n.t('Please select the items you want to remove'),
        matchOnDetail: true,
        canPickMany: true,
    });
    if (!selected?.length) return;

    const confirm = await confirmModal(
        vscode.l10n.t('The selected items will be removed from the list'),
        vscode.l10n.t('Remove'),
        selected.map((item) => item.description).join('\n'),
    );
    if (!confirm) return;

    const selectedSet = new Set(selected.map((item) => toSimplePath(item.description)));
    const remaining = repos.filter((repo) => !selectedSet.has(toSimplePath(repo)));
    await updateNestedRepos(remaining);
    treeDataEvent.fire();
    Alert.showInformationMessage(vscode.l10n.t('Removed successfully'));
};
