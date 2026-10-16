import * as vscode from 'vscode';
import { normalizeRepositoryPath } from '@/core/util/multiRepositoryWorktree';
import { Alert } from '@/core/ui/message';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';
import { pickBranch } from '@/core/quickPick/pickBranch';
import {
    completeMultiRepositoryWorktree,
    createMultiRepositoryWorktree,
    getMultiRepositoryWorktrees,
    getWorkspaceContext,
    removeChildRepositoryWorktree,
    removeMultiRepositoryWorktree,
    type MultiRepositoryWorktreeEntry,
} from '@/core/multiRepository/worktreeService';
import { Commands } from '@/constants';
import {
    openInCurrentWindowQuickInputButton,
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    removeMultiRepositoryWorktreeQuickInputButton,
    completeRepositoriesQuickInputButton,
    removeChildRepositoryQuickInputButton,
    viewChildRepositoriesQuickInputButton,
} from '@/core/quickPick/quickPick.button';
import { pickRepositories, pickRepositoriesWithBackButton } from '@/core/quickPick/pickRepositories';

import { showMultiRepositoryWorktreesQuickPick } from '@/core/quickPick/multiRepositoryWorktrees';
import { showMultiRepositoryChildRepositoriesQuickPick } from '@/core/quickPick/multiRepositoryChildRepositories';

const multiRepositoryWorktreeCache = new Map<string, MultiRepositoryWorktreeEntry[]>();

async function openWorktreeTerminal(
    entry: MultiRepositoryWorktreeEntry,
    button: vscode.QuickInputButton,
): Promise<void> {
    const item = {
        name: entry.branch,
        fsPath: entry.path,
        uriPath: vscode.Uri.file(entry.path).toString(),
    };
    const command =
        button === openExternalTerminalQuickInputButton ? Commands.openExternalTerminalContext : Commands.openTerminal;
    await vscode.commands.executeCommand(command, item);
}

async function createMultiRepositoryWorktreeFromWorkspace(root: string): Promise<void> {
    const { mainRepo, repos } = await getWorkspaceContext(root);
    const pickBranchStep = () =>
        pickBranch({
            title: vscode.l10n.t('Create Multi-Repository Worktree'),
            placeholder: vscode.l10n.t('Select an existing branch or create a new branch'),
            mainFolder: mainRepo,
            cwd: mainRepo,
            showCreate: true,
            createBranchOnPick: false,
            step: 1,
            totalSteps: 3,
        });

    let selectedBranch = await pickBranchStep();
    while (true) {
        const branchSelection = selectedBranch;
        if (!branchSelection || !branchSelection.branch) return;

        const branch = (
            branchSelection.remote
                ? branchSelection.branch.slice(branchSelection.branch.indexOf('/') + 1)
                : branchSelection.branch
        ).trim();

        const targetRoot = await inputWorktreeDir({
            baseDir: mainRepo,
            refName: branch.replace(/[\\/]/g, '-'),
            targetDirTip: vscode.l10n.t('Select the folder for the multi-repository worktree'),
            step: 2,
            totalSteps: 3,
            hasBackButton: true,
        });
        if (!targetRoot) {
            selectedBranch = await pickBranchStep();
            continue;
        }

        const selectedRepos = await pickRepositories(repos, {
            title: vscode.l10n.t('Create Multi-Repository Worktree'),
            placeHolder: vscode.l10n.t('Select repositories to include in this worktree'),
            canSelectMany: true,
            step: 3,
            totalSteps: 3,
        });
        if (!selectedRepos?.length) return;

        const selectedRepoPaths = selectedRepos.map((repo) => repo.relativePath);
        const target = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t('Creating multi-repository worktree'),
                cancellable: false,
            },
            () =>
                createMultiRepositoryWorktree(root, branch, selectedRepoPaths, targetRoot, branchSelection.startPoint),
        );
        if (target) {
            void vscode.window.showInformationMessage(vscode.l10n.t('Multi-repository worktree created: {0}', target));
        }
        return;
    }
}

export async function createMultiRepositoryWorktreeCmd(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Open a folder containing gwm.json first'));
        return;
    }
    try {
        await createMultiRepositoryWorktreeFromWorkspace(root);
    } catch (error) {
        Alert.showErrorMessage(String(error));
    }
}

export async function multiRepositoryWorktreesCmd(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Open a folder containing gwm.json first'));
        return;
    }

    let state: Awaited<ReturnType<typeof getMultiRepositoryWorktrees>> | undefined;
    const cacheKey = normalizeRepositoryPath(root);
    const loadState = async () => {
        state = await getMultiRepositoryWorktrees(root);
        multiRepositoryWorktreeCache.set(cacheKey, state.entries);
        return state;
    };

    try {
        showMultiRepositoryWorktreesQuickPick({
            currentWorktreePath: root,
            entries: multiRepositoryWorktreeCache.get(cacheKey) ?? [],
            refreshEntries: async () => (await loadState()).entries,
            onLoadError: (error) => Alert.showErrorMessage(String(error)),
            onCreate: async () => {
                try {
                    await createMultiRepositoryWorktreeFromWorkspace(root);
                    await multiRepositoryWorktreesCmd();
                } catch (error) {
                    Alert.showErrorMessage(String(error));
                }
            },
            onAccept: async (selected, quickPick) => {
                quickPick.hide();
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selected.entry.path), {
                    forceNewWindow: true,
                });
            },
            onItemButton: async (event, quickPick, refreshItems) => {
                const currentState = state;
                if (!currentState) return;
                const { mainRepo, repos } = currentState;

                if (event.button === viewChildRepositoriesQuickInputButton) {
                    quickPick.hide();
                    const childQuickPick = showMultiRepositoryChildRepositoriesQuickPick({
                        entry: event.item.entry,
                        repos,
                        onError: (error) => Alert.showErrorMessage(String(error)),
                        onAccept: async (selected) => {
                            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selected.path), {
                                forceNewWindow: true,
                            });
                        },
                        onItemButton: async (childEvent, refreshItems, close) => {
                            if (childEvent.button === openInCurrentWindowQuickInputButton) {
                                close(false);
                                await vscode.commands.executeCommand(
                                    'vscode.openFolder',
                                    vscode.Uri.file(childEvent.item.path),
                                    { forceNewWindow: false, forceReuseWindow: true },
                                );
                                return;
                            }
                            if (
                                childEvent.button !== removeChildRepositoryQuickInputButton ||
                                event.item.entry.isMain
                            ) {
                                return;
                            }

                            const confirmation = await vscode.window.showWarningMessage(
                                vscode.l10n.t(
                                    'Remove repository {0} from worktree {1}?',
                                    childEvent.item.repo.relativePath,
                                    event.item.entry.path,
                                ),
                                { modal: true },
                                vscode.l10n.t('Remove'),
                            );
                            if (!confirmation) return;

                            await vscode.window.withProgress(
                                {
                                    location: vscode.ProgressLocation.Notification,
                                    title: vscode.l10n.t('Removing child repository worktree'),
                                    cancellable: false,
                                },
                                () =>
                                    removeChildRepositoryWorktree(
                                        repos,
                                        event.item.entry,
                                        childEvent.item.repo.relativePath,
                                    ),
                            );

                            const repoIndex = repos.findIndex(
                                (repo) => repo.relativePath === childEvent.item.repo.relativePath,
                            );
                            if (repoIndex >= 0) event.item.entry.repoStatuses[repoIndex] = false;
                            refreshItems();
                            void vscode.window.showInformationMessage(
                                vscode.l10n.t(
                                    'Child repository worktree removed: {0}',
                                    childEvent.item.repo.relativePath,
                                ),
                            );
                        },
                    });
                    if (await childQuickPick.closed) await multiRepositoryWorktreesCmd();
                    return;
                }

                if (event.button === completeRepositoriesQuickInputButton) {
                    const missingRepos = repos.filter((_, index) => !event.item.entry.repoStatuses[index]);
                    if (!missingRepos.length) return;
                    quickPick.hide();
                    try {
                        const selectedRepos = await pickRepositoriesWithBackButton(missingRepos, {
                            title: vscode.l10n.t('Complete Missing Repositories'),
                            placeHolder: vscode.l10n.t('Select repositories to add to this worktree'),
                            canSelectMany: true,
                        });
                        if (selectedRepos?.length) {
                            await vscode.window.withProgress(
                                {
                                    location: vscode.ProgressLocation.Notification,
                                    title: vscode.l10n.t('Completing multi-repository worktree'),
                                    cancellable: false,
                                },
                                () =>
                                    completeMultiRepositoryWorktree(
                                        repos,
                                        event.item.entry,
                                        selectedRepos.map((repo) => repo.relativePath),
                                    ),
                            );
                            void vscode.window.showInformationMessage(
                                vscode.l10n.t('Multi-repository worktree completed: {0}', event.item.entry.path),
                            );
                        }
                    } catch (error) {
                        Alert.showErrorMessage(String(error));
                    } finally {
                        await multiRepositoryWorktreesCmd();
                    }
                    return;
                }
                if (event.button === removeChildRepositoryQuickInputButton) {
                    const generatedRepos = repos.filter((_, index) => event.item.entry.repoStatuses[index]);
                    if (!generatedRepos.length) return;
                    quickPick.hide();
                    try {
                        const selectedRepos = await pickRepositoriesWithBackButton(generatedRepos, {
                            title: vscode.l10n.t('Remove Child Repository'),
                            placeHolder: vscode.l10n.t('Select generated repositories to remove from this worktree'),
                            canSelectMany: true,
                        });
                        if (!selectedRepos?.length) return;
                        const confirmation = await vscode.window.showWarningMessage(
                            vscode.l10n.t(
                                'Remove {0} repositories from worktree {1}?',
                                selectedRepos.length,
                                event.item.entry.path,
                            ),
                            { modal: true },
                            vscode.l10n.t('Remove'),
                        );
                        if (!confirmation) return;
                        await vscode.window.withProgress(
                            {
                                location: vscode.ProgressLocation.Notification,
                                title: vscode.l10n.t('Removing child repository worktrees'),
                                cancellable: false,
                            },
                            async () => {
                                for (const repo of selectedRepos) {
                                    await removeChildRepositoryWorktree(repos, event.item.entry, repo.relativePath);
                                }
                            },
                        );
                        void vscode.window.showInformationMessage(
                            vscode.l10n.t('Child repository worktrees removed: {0}', selectedRepos.length),
                        );
                    } catch (error) {
                        Alert.showErrorMessage(String(error));
                    } finally {
                        await multiRepositoryWorktreesCmd();
                    }
                    return;
                }
                if (
                    event.button === openExternalTerminalQuickInputButton ||
                    event.button === openTerminalQuickInputButton
                ) {
                    await openWorktreeTerminal(event.item.entry, event.button);
                    return;
                }
                if (event.button === openInCurrentWindowQuickInputButton) {
                    quickPick.hide();
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(event.item.entry.path), {
                        forceNewWindow: false,
                        forceReuseWindow: true,
                    });
                    return;
                }
                if (event.button !== removeMultiRepositoryWorktreeQuickInputButton || event.item.entry.isMain) return;

                const confirmation = await vscode.window.showWarningMessage(
                    vscode.l10n.t('Remove the multi-repository worktree {0}?', event.item.entry.path),
                    { modal: true },
                    vscode.l10n.t('Remove'),
                );
                if (!confirmation) return;

                quickPick.busy = true;
                try {
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: vscode.l10n.t('Removing multi-repository worktree'),
                            cancellable: false,
                        },
                        () => removeMultiRepositoryWorktree(mainRepo, repos, event.item.entry),
                    );
                    void vscode.window.showInformationMessage(
                        vscode.l10n.t('Multi-repository worktree removed: {0}', event.item.entry.path),
                    );
                    await refreshItems();
                } catch (error) {
                    quickPick.busy = false;
                    Alert.showErrorMessage(String(error));
                }
            },
        });
    } catch (error) {
        Alert.showErrorMessage(String(error));
    }
}
