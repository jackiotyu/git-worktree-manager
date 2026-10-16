import * as vscode from 'vscode';
import type { MultiRepositoryWorktreeEntry } from '@/core/multiRepository/worktreeService';
import { normalizeRepositoryPath } from '@/core/util/multiRepositoryWorktree';
import {
    openInCurrentWindowQuickInputButton,
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    createMultiRepositoryWorktreeQuickInputButton,
    removeMultiRepositoryWorktreeQuickInputButton,
    completeRepositoriesQuickInputButton,
    removeChildRepositoryQuickInputButton,
} from './quickPick.button';

export interface MultiRepositoryWorktreePickItem extends vscode.QuickPickItem {
    entry: MultiRepositoryWorktreeEntry;
    buttons: vscode.QuickInputButton[];
}

export function createMultiRepositoryWorktreePickItem(
    entry: MultiRepositoryWorktreeEntry,
    currentWorktreePath: string,
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
        iconPath: new vscode.ThemeIcon(
            normalizeRepositoryPath(entry.path) === normalizeRepositoryPath(currentWorktreePath) ? 'check' : 'window',
        ),
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
    currentWorktreePath: string;
    refreshEntries: () => Promise<MultiRepositoryWorktreeEntry[]>;
    onLoadError?: (error: unknown) => void;
    onCreate: () => Promise<void>;
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
    quickPick.items = options.entries.map((entry) => createMultiRepositoryWorktreePickItem(entry, options.currentWorktreePath));

    const disposables: vscode.Disposable[] = [];
    let isDisposed = false;
    let resolveHidden: (() => void) | undefined;
    const hidden = new Promise<void>((resolve) => {
        resolveHidden = resolve;
    });
    const refreshItems = async () => {
        quickPick.busy = true;
        try {
            const entries = await options.refreshEntries();
            if (!isDisposed) {
                quickPick.items = entries.map((entry) => createMultiRepositoryWorktreePickItem(entry, options.currentWorktreePath));
            }
        } catch (error) {
            if (!isDisposed) {
                options.onLoadError?.(error);
                quickPick.hide();
            }
        } finally {
            if (!isDisposed) quickPick.busy = false;
        }
    };

    disposables.push(
        quickPick.onDidTriggerButton(async (button) => {
            if (quickPick.busy || button !== createMultiRepositoryWorktreeQuickInputButton) return;

            quickPick.hide();
            await hidden;
            await options.onCreate();
        }),
        quickPick.onDidAccept(async () => {
            if (quickPick.busy) return;
            const selected = quickPick.selectedItems[0];
            if (!selected) return;
            await options.onAccept(selected, quickPick);
        }),
        quickPick.onDidTriggerItemButton((event) => {
            if (quickPick.busy) return;
            return options.onItemButton(event, quickPick, refreshItems);
        }),
        quickPick.onDidHide(() => {
            isDisposed = true;
            resolveHidden?.();
            quickPick.dispose();
            disposables.forEach((disposable) => disposable.dispose());
        }),
    );
    quickPick.busy = true;
    quickPick.show();
    void refreshItems();
    return quickPick;
}
