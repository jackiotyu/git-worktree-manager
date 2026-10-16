import * as vscode from 'vscode';
import {
    openInCurrentWindowQuickInputButton,
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    createMultiRepositoryWorktreeQuickInputButton,
    removeMultiRepositoryWorktreeQuickInputButton,
    completeRepositoriesQuickInputButton,
    removeChildRepositoryQuickInputButton,
} from './quickPick.button';

export interface MultiRepositoryWorktreeEntry {
    path: string;
    branch: string;
    isMain: boolean;
    repoStatuses: boolean[];
}

export interface MultiRepositoryWorktreePickItem extends vscode.QuickPickItem {
    entry: MultiRepositoryWorktreeEntry;
    buttons: vscode.QuickInputButton[];
}

export function createMultiRepositoryWorktreePickItem(
    entry: MultiRepositoryWorktreeEntry,
): MultiRepositoryWorktreePickItem {
    const readyCount = entry.repoStatuses.filter(Boolean).length;
    const missingCount = entry.repoStatuses.length - readyCount;
    return {
        label: entry.branch,
        description: entry.path,
        detail: missingCount
            ? vscode.l10n.t(
                  '{0}/{1} repositories ready · {2} missing',
                  readyCount,
                  entry.repoStatuses.length,
                  missingCount,
              )
            : vscode.l10n.t('{0}/{1} repositories ready', readyCount, entry.repoStatuses.length),
        entry,
        buttons: [
            ...(entry.isMain ? [] : [removeMultiRepositoryWorktreeQuickInputButton]),
            ...(openExternalTerminalQuickInputButton.enabled ? [openExternalTerminalQuickInputButton] : []),
            ...(openTerminalQuickInputButton.enabled ? [openTerminalQuickInputButton] : []),
            completeRepositoriesQuickInputButton,
            removeChildRepositoryQuickInputButton,
            openInCurrentWindowQuickInputButton,
        ].filter((button) => button.enabled),
    };
}

export interface MultiRepositoryWorktreeQuickPickOptions {
    entries: MultiRepositoryWorktreeEntry[];
    refreshEntries: () => Promise<MultiRepositoryWorktreeEntry[]>;
    onCreate: (quickPick: vscode.QuickPick<MultiRepositoryWorktreePickItem>) => Promise<void>;
    onAccept: (
        selected: MultiRepositoryWorktreePickItem,
        quickPick: vscode.QuickPick<MultiRepositoryWorktreePickItem>,
    ) => Promise<void>;
    onItemButton: (
        event: vscode.QuickPickItemButtonEvent<MultiRepositoryWorktreePickItem>,
        quickPick: vscode.QuickPick<MultiRepositoryWorktreePickItem>,
        refreshItems: () => Promise<void>,
    ) => Promise<void>;
}

export function showMultiRepositoryWorktreesQuickPick(
    options: MultiRepositoryWorktreeQuickPickOptions,
): vscode.QuickPick<MultiRepositoryWorktreePickItem> {
    const quickPick = vscode.window.createQuickPick<MultiRepositoryWorktreePickItem>();
    quickPick.title = vscode.l10n.t('Multi-Repository Worktrees');
    quickPick.buttons = [createMultiRepositoryWorktreeQuickInputButton];
    quickPick.placeholder = vscode.l10n.t('Select a worktree to open in a new window');
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.items = options.entries.map(createMultiRepositoryWorktreePickItem);

    const disposables: vscode.Disposable[] = [];
    const refreshItems = async () => {
        const entries = await options.refreshEntries();
        quickPick.items = entries.map(createMultiRepositoryWorktreePickItem);
    };

    disposables.push(
        quickPick.onDidTriggerButton(async (button) => {
            if (button === createMultiRepositoryWorktreeQuickInputButton) {
                await options.onCreate(quickPick);
            }
        }),
        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            if (!selected) return;
            await options.onAccept(selected, quickPick);
        }),
        quickPick.onDidTriggerItemButton((event) => options.onItemButton(event, quickPick, refreshItems)),
        quickPick.onDidHide(() => {
            quickPick.dispose();
            disposables.forEach((disposable) => disposable.dispose());
        }),
    );
    quickPick.show();
    return quickPick;
}
