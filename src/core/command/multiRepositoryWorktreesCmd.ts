import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { addBranchWorktree } from '@/core/git/addBranchWorktree';
import { getWorktrees } from '@/core/git/getWorktrees';
import { pathExists } from '@/core/util/fs';
import { resolveSafeRelativePath, toSimplePath } from '@/core/util/path';
import { hasGitMetadata, isGitRepository } from '@/core/util/repo';
import { loadConfig } from '@/core/util/workspaceConfig';
import {
    hasConfiguredRemote,
    isMarkedMultiRepositoryWorktree,
    isRegisteredWorktree,
    markMultiRepositoryWorktree,
    normalizeRepositoryPath,
} from '@/core/util/multiRepositoryWorktree';
import { Alert } from '@/core/ui/message';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { Commands } from '@/constants';
import {
    openInCurrentWindowQuickInputButton,
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    removeMultiRepositoryWorktreeQuickInputButton,
    completeRepositoriesQuickInputButton,
    removeChildRepositoryQuickInputButton,
} from '@/core/quickPick/quickPick.button';
import { pickRepositories, pickRepositoriesWithBackButton } from '@/core/quickPick/pickRepositories';

import {
    showMultiRepositoryWorktreesQuickPick,
    type MultiRepositoryWorktreeEntry,
} from '@/core/quickPick/multiRepositoryWorktrees';

async function getMainWorktreeRootFromMetadata(root: string): Promise<string> {
    const gitEntry = path.join(root, '.git');
    const stat = await fs.stat(gitEntry);

    if (stat.isDirectory()) return root;
    if (!stat.isFile()) return '';

    const content = await fs.readFile(gitEntry, 'utf8');
    const match = /^gitdir:\s*(.+)\s*$/im.exec(content);
    if (!match) return '';

    const gitDir = path.resolve(root, match[1].trim());
    let commonDir = gitDir;
    try {
        const commonDirContent = await fs.readFile(path.join(gitDir, 'commondir'), 'utf8');
        commonDir = path.resolve(gitDir, commonDirContent.trim());
    } catch {
        // A worktree created from a bare repository may not have a .git common directory.
    }

    return path.basename(commonDir) === '.git' ? path.dirname(commonDir) : root;
}

async function getWorkspaceContext(root: string): Promise<{ mainRepo: string; repos: RepoEntry[] }> {
    if (!(await hasGitMetadata(root))) {
        throw new Error(vscode.l10n.t('Open the repository root containing workspace.json, not a subfolder.'));
    }

    const mainRepo = await getMainWorktreeRootFromMetadata(root);
    if (!mainRepo) throw new Error(vscode.l10n.t('Unable to resolve the main repository.'));
    const repos = await loadConfig(root, mainRepo);
    return { mainRepo, repos };
}

async function createMultiRepositoryWorktree(
    root: string,
    branch: string,
    selectedRepoPaths: string[],
    targetRoot: string,
    startPoint?: string,
): Promise<string> {
    const { mainRepo, repos: configuredRepos } = await getWorkspaceContext(root);
    const selectedPaths = new Set(selectedRepoPaths);
    const repos = configuredRepos.filter((repo) => selectedPaths.has(repo.relativePath));

    const created: Array<{ repoPath: string; worktreePath: string }> = [];
    const targetRootExisted = await pathExists(targetRoot);
    let parentCreated = false;
    try {
        await addBranchWorktree(mainRepo, targetRoot, branch, startPoint);
        parentCreated = true;
        await markMultiRepositoryWorktree(targetRoot);
        for (const repo of repos) {
            await ensureRepositorySource(repo, root);
            const targetPath = resolveSafeRelativePath(targetRoot, repo.relativePath);
            if (await pathExists(targetPath)) {
                throw new Error(`Target path already exists: ${targetPath}`);
            }
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await addBranchWorktree(repo.sourcePath, targetPath, branch);
            created.push({ repoPath: repo.sourcePath, worktreePath: targetPath });
        }
        return targetRoot;
    } catch (error) {
        const cleanupErrors: string[] = [];
        for (const item of created.reverse()) {
            try {
                await execAuto(item.repoPath, ['worktree', 'remove', '--force', item.worktreePath]);
            } catch (cleanupError) {
                cleanupErrors.push(String(cleanupError));
            }
        }
        if (parentCreated) {
            try {
                await execAuto(mainRepo, ['worktree', 'remove', '--force', targetRoot]);
                if (targetRootExisted) {
                    await fs.mkdir(targetRoot, { recursive: true });
                }
            } catch (cleanupError) {
                cleanupErrors.push(String(cleanupError));
            }
        }
        if (cleanupErrors.length) {
            throw new Error(vscode.l10n.t('Partially created; cleanup may be required: {0}', cleanupErrors.join('; ')));
        }
        throw error;
    }
}

async function getMultiRepositoryWorktrees(
    root: string,
): Promise<{ mainRepo: string; repos: RepoEntry[]; entries: MultiRepositoryWorktreeEntry[] }> {
    const { mainRepo, repos } = await getWorkspaceContext(root);
    const worktrees = await getWorktrees(mainRepo);
    const result = await Promise.all(
        worktrees.map(async (entry): Promise<MultiRepositoryWorktreeEntry> => {
            const isMain = normalizeRepositoryPath(entry.path) === normalizeRepositoryPath(mainRepo);
            const repoStatuses = await Promise.all(
                repos.map((repo) => {
                    const repoPath = isMain ? repo.sourcePath : resolveSafeRelativePath(entry.path, repo.relativePath);
                    return hasGitMetadata(repoPath);
                }),
            );
            return {
                ...entry,
                isMain,
                isMultiRepository: !isMain && (await isMarkedMultiRepositoryWorktree(entry.path)),
                repoStatuses,
            };
        }),
    );
    return {
        mainRepo,
        repos,
        entries: result.filter((entry) => entry.isMain || entry.isMultiRepository || entry.repoStatuses.some(Boolean)),
    };
}

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

async function completeMultiRepositoryWorktree(
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
    selectedRepoPaths: string[],
): Promise<void> {
    const selectedPaths = new Set(selectedRepoPaths);
    const selectedRepos = repos.filter(
        (repo, index) => selectedPaths.has(repo.relativePath) && !entry.repoStatuses[index],
    );
    const created: Array<{ repoPath: string; worktreePath: string }> = [];

    try {
        for (const repo of selectedRepos) {
            await ensureRepositorySource(repo, entry.path);
            const targetPath = resolveSafeRelativePath(entry.path, repo.relativePath);
            if (await pathExists(targetPath)) {
                throw new Error(`Target path already exists: ${targetPath}`);
            }
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await addBranchWorktree(repo.sourcePath, targetPath, entry.branch);
            created.push({ repoPath: repo.sourcePath, worktreePath: targetPath });
        }
    } catch (error) {
        const cleanupErrors: string[] = [];
        for (const item of created.reverse()) {
            try {
                await execAuto(item.repoPath, ['worktree', 'remove', '--force', item.worktreePath]);
            } catch (cleanupError) {
                cleanupErrors.push(String(cleanupError));
            }
        }
        if (cleanupErrors.length) {
            throw new Error(
                vscode.l10n.t('Partially completed; cleanup may be required: {0}', cleanupErrors.join('; ')),
            );
        }
        throw error;
    }
}

interface WorktreeChange {
    status: string;
    filePath: string;
}

async function getWorktreeChanges(worktreePath: string, ignoredChildPaths: string[] = []): Promise<WorktreeChange[]> {
    const { stdout } = await execAuto(worktreePath, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
    const backslash = String.fromCharCode(92);
    const ignoredPaths = ignoredChildPaths.map((item) =>
        item.split(backslash).join('/').split('/').filter(Boolean).join('/'),
    );
    return stdout
        .split(String.fromCharCode(0))
        .filter(Boolean)
        .map((record) => ({
            status: record.slice(0, 2),
            filePath: record.slice(3),
        }))
        .filter((change) => {
            if (change.status !== '??') return true;
            const filePath = path.posix.normalize(change.filePath).replace(/\/+$/, '');
            return !ignoredPaths.some((childPath) => filePath === childPath || filePath.startsWith(`${childPath}/`));
        });
}

async function assertWorktreeClean(worktreePath: string, ignoredChildPaths: string[] = []): Promise<void> {
    const changes = await getWorktreeChanges(worktreePath, ignoredChildPaths);
    if (changes.length) {
        throw new Error(vscode.l10n.t('Worktree contains uncommitted changes: {0}', worktreePath));
    }
}

async function removeMultiRepositoryWorktree(
    mainRepo: string,
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
): Promise<void> {
    if (entry.isMain) {
        throw new Error('The main worktree cannot be removed.');
    }

    const children: Array<{ repo: RepoEntry; path: string }> = [];
    for (const repo of repos) {
        const childPath = resolveSafeRelativePath(entry.path, repo.relativePath);
        if (!(await pathExists(childPath))) continue;

        children.push({ repo, path: childPath });
    }

    for (const child of children) {
        await assertWorktreeClean(child.path);
    }
    await assertWorktreeClean(
        entry.path,
        children.map((child) => child.repo.relativePath),
    );

    const removed: string[] = [];
    let removing = '';
    try {
        for (const child of children) {
            removing = child.repo.relativePath;
            await execAuto(child.repo.sourcePath, ['worktree', 'remove', child.path]);
            removed.push(child.repo.relativePath);
        }
        removing = entry.path;
        await execAuto(mainRepo, ['worktree', 'remove', entry.path]);
    } catch (error) {
        if (removed.length) {
            throw new Error(
                vscode.l10n.t(
                    'Partially removed worktree. Removed: {0}. Failed at {1}: {2}',
                    removed.join(', '),
                    removing,
                    String(error),
                ),
            );
        }
        throw error;
    }
}

async function removeChildRepositoryWorktree(
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
    relativePath: string,
): Promise<void> {
    const repo = repos.find((item) => item.relativePath === relativePath);
    if (!repo) throw new Error(`Repository is not configured: ${relativePath}`);

    const childPath = resolveSafeRelativePath(entry.path, repo.relativePath);
    if (!(await isConfiguredRepository(repo)) || !(await isRegisteredWorktree(repo.sourcePath, childPath))) {
        throw new Error(`No generated worktree found for repository: ${repo.relativePath}`);
    }
    await assertWorktreeClean(childPath);
    await execAuto(repo.sourcePath, ['worktree', 'remove', childPath]);
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
        void vscode.window.showErrorMessage(vscode.l10n.t('Open a folder containing workspace.json first'));
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
        void vscode.window.showErrorMessage(vscode.l10n.t('Open a folder containing workspace.json first'));
        return;
    }

    let state: Awaited<ReturnType<typeof getMultiRepositoryWorktrees>> | undefined;
    const cacheKey = getWorktreeCacheKey(root);
    const loadState = async () => {
        state = await getMultiRepositoryWorktrees(root);
        multiRepositoryWorktreeCache.set(cacheKey, state.entries);
        return state;
    };

    try {
        showMultiRepositoryWorktreesQuickPick({
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
