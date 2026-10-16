import * as vscode from 'vscode';
import path from 'path';
import { scanNestedRepos } from '@/core/util/repoScan';
import { getNestedRepos, updateNestedRepos } from '@/core/util/nestedRepo';
import { treeDataEvent } from '@/core/event/events';
import { Alert } from '@/core/ui/message';
import { withResolvers } from '@/core/util/promise';

interface INestedRepoPickItem extends vscode.QuickPickItem {
    fsPath: string;
}

// Show the picker immediately; scanning runs while the picker displays its loading indicator.
export const selectNestedReposCmd = async () => {
    const registeredSet = new Set(getNestedRepos());
    const title = vscode.l10n.t('Select nested Git repositories to display');
    const quickPick = vscode.window.createQuickPick<INestedRepoPickItem>();
    const { resolve, promise } = withResolvers<INestedRepoPickItem[] | undefined>();
    let isDisposed = false;

    quickPick.title = title;
    quickPick.placeholder = title;
    quickPick.canSelectMany = true;
    quickPick.matchOnDescription = true;
    quickPick.items = [];
    quickPick.busy = true;
    quickPick.onDidAccept(() => {
        if (quickPick.busy) return;
        resolve([...quickPick.selectedItems]);
        quickPick.hide();
    });
    quickPick.onDidHide(() => {
        isDisposed = true;
        resolve(undefined);
        quickPick.dispose();
    });

    quickPick.show();

    void (async () => {
        try {
            const discovered = await scanNestedRepos();
            if (isDisposed) return;

            const candidates = [...new Set([...discovered, ...registeredSet])].sort((a, b) =>
                path.basename(a).localeCompare(path.basename(b)),
            );
            if (candidates.length === 0) {
                quickPick.hide();
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
            quickPick.items = items;
            quickPick.selectedItems = items.filter((item) => item.picked);
        } catch (error) {
            if (!isDisposed) {
                Alert.showErrorMessage(String(error));
                quickPick.hide();
            }
        } finally {
            if (!isDisposed) quickPick.busy = false;
        }
    })();

    const selected = await promise;
    if (!selected?.length) return;

    await updateNestedRepos(selected.map((item) => item.fsPath));
    treeDataEvent.fire();
};
