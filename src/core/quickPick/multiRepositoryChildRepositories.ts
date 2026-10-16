import * as vscode from 'vscode';
import type { MultiRepositoryWorktreeEntry } from '@/core/multiRepository/worktreeService';
import { resolveSafeRelativePath } from '@/core/util/path';
import type { RepoEntry } from '@/types';
import {
    backButton,
    openInCurrentWindowQuickInputButton,
    removeChildRepositoryQuickInputButton,
} from '@/core/quickPick/quickPick.button';

export interface MultiRepositoryChildRepositoryPickItem extends vscode.QuickPickItem {
    repo: RepoEntry;
    path: string;
}

export interface MultiRepositoryChildRepositoriesQuickPickOptions {
    entry: MultiRepositoryWorktreeEntry;
    repos: RepoEntry[];
    onAccept: (item: MultiRepositoryChildRepositoryPickItem) => Promise<void>;
    onItemButton: (
        event: vscode.QuickPickItemButtonEvent<MultiRepositoryChildRepositoryPickItem>,
        refreshItems: () => void,
        close: (reopenParent: boolean) => void,
    ) => Promise<void>;
    onError?: (error: unknown) => void;
}

export function showMultiRepositoryChildRepositoriesQuickPick(
    options: MultiRepositoryChildRepositoriesQuickPickOptions,
): { closed: Promise<boolean> } {
    const quickPick = vscode.window.createQuickPick<MultiRepositoryChildRepositoryPickItem>();
    quickPick.title = vscode.l10n.t('Child Repositories in {0}', options.entry.branch);
    quickPick.buttons = [backButton];
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.ignoreFocusOut = true;

    const disposables: vscode.Disposable[] = [];
    let isDisposed = false;
    let reopenParent = true;
    let resolveClosed: ((reopenParent: boolean) => void) | undefined;
    const closed = new Promise<boolean>((resolve) => {
        resolveClosed = resolve;
    });

    const refreshItems = () => {
        if (isDisposed) return;
        quickPick.items = options.repos.flatMap((repo, index) => {
            if (!options.entry.repoStatuses[index]) return [];
            const repoPath = options.entry.isMain
                ? repo.sourcePath
                : resolveSafeRelativePath(options.entry.path, repo.relativePath);
            return [
                {
                    label: repo.name,
                    description: repo.relativePath,
                    detail: repoPath,
                    repo,
                    path: repoPath,
                    buttons: [
                        ...(!options.entry.isMain ? [removeChildRepositoryQuickInputButton] : []),
                        openInCurrentWindowQuickInputButton,
                    ],
                },
            ];
        });
        quickPick.placeholder = quickPick.items.length
            ? vscode.l10n.t('Select a child repository to open in a new window')
            : vscode.l10n.t('No child repositories found in this worktree');
    };

    const close = (shouldReopenParent: boolean) => {
        if (isDisposed) return;
        reopenParent = shouldReopenParent;
        quickPick.hide();
    };

    disposables.push(
        quickPick.onDidTriggerButton((button) => {
            if (button === backButton) quickPick.hide();
        }),
        quickPick.onDidAccept(async () => {
            if (quickPick.busy) return;
            const selected = quickPick.selectedItems[0];
            if (!selected) return;

            quickPick.busy = true;
            try {
                await options.onAccept(selected);
                if (!isDisposed) quickPick.hide();
            } catch (error) {
                options.onError?.(error);
                if (!isDisposed) quickPick.busy = false;
            }
        }),
        quickPick.onDidTriggerItemButton(async (event) => {
            if (quickPick.busy) return;
            quickPick.busy = true;
            try {
                await options.onItemButton(event, refreshItems, close);
                if (!isDisposed) quickPick.busy = false;
            } catch (error) {
                options.onError?.(error);
                if (!isDisposed) quickPick.busy = false;
            }
        }),
        quickPick.onDidHide(() => {
            isDisposed = true;
            resolveClosed?.(reopenParent);
            quickPick.dispose();
            disposables.forEach((disposable) => disposable.dispose());
        }),
    );

    refreshItems();
    quickPick.show();
    return { closed };
}
