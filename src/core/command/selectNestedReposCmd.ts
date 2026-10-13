import * as vscode from 'vscode';
import path from 'path';
import { scanNestedRepos } from '@/core/util/repoScan';
import { getNestedRepos, updateNestedRepos } from '@/core/util/nestedRepo';
import { treeDataEvent } from '@/core/event/events';
import { Alert } from '@/core/ui/message';

interface INestedRepoPickItem extends vscode.QuickPickItem {
    fsPath: string;
}

// Select nested repositories to display: scan the current workspace, then let the user pick (writes to workspaceNestedRepos)
export const selectNestedReposCmd = async () => {
    const discovered = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Searching Git repositories'),
            cancellable: false,
        },
        () => scanNestedRepos(),
    );

    const registered = getNestedRepos();
    const registeredSet = new Set(registered);
    const candidates = [...new Set([...discovered, ...registered])].sort((a, b) =>
        path.basename(a).localeCompare(path.basename(b)),
    );

    if (candidates.length === 0) {
        Alert.showInformationMessage(vscode.l10n.t('No nested Git repositories found'));
        return;
    }

    const iconPath = new vscode.ThemeIcon('repo');
    const items: INestedRepoPickItem[] = candidates.map((fsPath) => ({
        fsPath,
        iconPath,
        label: path.basename(fsPath),
        description: fsPath,
        picked: registeredSet.has(fsPath),
    }));

    const title = vscode.l10n.t('Select nested Git repositories to display');
    const selected = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: title,
        matchOnDescription: true,
        canPickMany: true,
    });

    if (!selected) return;

    await updateNestedRepos(selected.map((item) => item.fsPath));
    treeDataEvent.fire();
};
