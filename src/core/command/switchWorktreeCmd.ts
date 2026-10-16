import * as vscode from 'vscode';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getFolderIcon } from '@/core/util/folder';

interface WorktreeQuickPickItem extends vscode.QuickPickItem {
    fsPath: string;
}

export const switchWorktreeCmd = async () => {
    const quickPick = vscode.window.createQuickPick<WorktreeQuickPickItem>();
    let isDisposed = false;
    let resolveSelection: (value: string | undefined) => void = () => {};
    const selection = new Promise<string | undefined>((resolve) => {
        resolveSelection = resolve;
    });

    quickPick.title = vscode.l10n.t('Switch Worktree');
    quickPick.placeholder = vscode.l10n.t('Please select the directory to switch to');
    quickPick.canSelectMany = false;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.items = [];
    quickPick.busy = true;

    quickPick.onDidAccept(() => {
        if (quickPick.busy) return;
        const selected = quickPick.selectedItems[0];
        if (!selected) return;
        resolveSelection(selected.fsPath);
        quickPick.hide();
    });
    quickPick.onDidHide(() => {
        isDisposed = true;
        resolveSelection(undefined);
        quickPick.dispose();
    });

    quickPick.show();

    void (async () => {
        try {
            const worktrees = await getWorktreeList();
            if (isDisposed) return;

            quickPick.items = worktrees.map((item) => ({
                label: item.name,
                description: item.path,
                iconPath: getFolderIcon(item.path),
                fsPath: item.path,
            }));
        } catch (error) {
            if (!isDisposed) {
                void vscode.window.showErrorMessage(String(error));
                quickPick.hide();
            }
        } finally {
            if (!isDisposed) quickPick.busy = false;
        }
    })();

    const selectedPath = await selection;
    if (!selectedPath) return;

    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedPath), {
        forceNewWindow: false,
        forceReuseWindow: true,
    });
};
