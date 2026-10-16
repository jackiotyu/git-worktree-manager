import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { getMainWorktreeRoot } from '@/core/git/getMainWorktreeRoot';
import { addBranchWorktree } from '@/core/git/addBranchWorktree';
import { getWorktrees } from '@/core/git/getWorktrees';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';
import { pathExists } from '@/core/util/fs';
import { resolveSafeRelativePath } from '@/core/util/path';
import { isGitRepository } from '@/core/util/repo';
import {
    getRegisteredWorktreePaths,
    hasConfiguredRemote,
    isMarkedMultiRepositoryWorktree,
    isNestedPath,
    isPathWithinRoot,
    isRegisteredWorktree,
    markMultiRepositoryWorktree,
    normalizeRepositoryPath,
    normalizeWorktreePath,
    resolveCanonicalPath,
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

interface WorkspaceRepo {
    name: string;
    remote: string;
}

interface WorkspaceConfig {
    version: 1;
    parent?: string;
    repo: Record<string, WorkspaceRepo>;
}

interface RepoEntry {
    relativePath: string;
    name: string;
    remote: string;
    sourcePath: string;
}

const configFileName = 'workspace.json';

async function isConfiguredRepository(repo: RepoEntry): Promise<boolean> {
    try {
        return (await isGitRepository(repo.sourcePath)) && (await hasConfiguredRemote(repo.sourcePath, repo.remote));
    } catch {
        return false;
    }
}

async function ensureRepositorySource(repo: RepoEntry, cloneCwd: string): Promise<void> {
    if (!(await pathExists(repo.sourcePath))) {
        await fs.mkdir(path.dirname(repo.sourcePath), { recursive: true });
        await execAuto(cloneCwd, ['clone', '--', repo.remote, repo.sourcePath]);
    }

    if (!(await isGitRepository(repo.sourcePath))) {
        throw new Error(
            vscode.l10n.t('Configured path exists but is not a Git repository: {0}', repo.relativePath),
        );
    }
    if (!(await hasConfiguredRemote(repo.sourcePath, repo.remote))) {
        throw new Error(vscode.l10n.t('Configured repository remote does not match: {0}', repo.relativePath));
    }
}

async function loadConfig(root: string, sourceRoot = root): Promise<RepoEntry[]> {
    const configPath = path.join(root, configFileName);
    let raw: string;
    try {
        raw = await fs.readFile(configPath, 'utf8');
    } catch {
        throw new Error(vscode.l10n.t('workspace.json was not found in the workspace root'));
    }

    let config: WorkspaceConfig;
    try {
        config = JSON.parse(raw) as WorkspaceConfig;
    } catch (error) {
        throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', String(error)));
    }
    if (config?.version !== 1 || !config.repo || typeof config.repo !== 'object' || Array.isArray(config.repo)) {
        throw new Error(
            vscode.l10n.t('Invalid workspace.json: {0}', vscode.l10n.t('Expected version 1 and a repo object')),
        );
    }

    if (config.parent !== undefined && (typeof config.parent !== 'string' || !config.parent.trim())) {
        throw new Error(vscode.l10n.t('Invalid parent path in workspace.json'));
    }
    const parentPath = typeof config.parent === 'string' ? config.parent.trim() : '';
    const repositoryRoot = parentPath ? path.resolve(root, parentPath) : sourceRoot;
    if (parentPath && !(await isGitRepository(repositoryRoot))) {
        throw new Error(vscode.l10n.t('Configured parent path is not a Git repository: {0}', repositoryRoot));
    }

    const repos: RepoEntry[] = [];
    const seenPaths = new Set<string>();
    for (const [relativePath, value] of Object.entries(config.repo)) {
        if (
            !value ||
            typeof value.name !== 'string' ||
            !value.name.trim() ||
            typeof value.remote !== 'string' ||
            !value.remote.trim()
        ) {
            throw new Error(
                vscode.l10n.t(
                    'Invalid workspace.json: {0}',
                    vscode.l10n.t('Invalid repository entry: {0}', relativePath),
                ),
            );
        }
        const sourcePath = resolveSafeRelativePath(repositoryRoot, relativePath);
        const normalized = normalizeRepositoryPath(sourcePath);
        if (seenPaths.has(normalized)) {
            throw new Error(
                vscode.l10n.t(
                    'Invalid workspace.json: {0}',
                    vscode.l10n.t('Duplicate repository path: {0}', relativePath),
                ),
            );
        }
        seenPaths.add(normalized);
        repos.push({ relativePath, name: value.name, remote: value.remote, sourcePath });
    }
    if (!repos.length) throw new Error(vscode.l10n.t('No repositories are configured in workspace.json'));

    const canonicalRoot = normalizeRepositoryPath(await resolveCanonicalPath(repositoryRoot));
    const canonicalPaths = await Promise.all(repos.map((repo) => resolveCanonicalPath(repo.sourcePath)));
    const normalizedCanonicalPaths = canonicalPaths.map(normalizeRepositoryPath);

    for (let i = 0; i < repos.length; i++) {
        if (!isPathWithinRoot(canonicalRoot, normalizedCanonicalPaths[i])) {
            throw new Error(
                vscode.l10n.t(
                    'Invalid workspace.json: {0}',
                    vscode.l10n.t('Repository path resolves outside the configured parent root: {0}', repos[i].relativePath),
                ),
            );
        }

        for (let j = i + 1; j < repos.length; j++) {
            const first = repos[i];
            const second = repos[j];
            if (normalizedCanonicalPaths[i] === normalizedCanonicalPaths[j]) {
                throw new Error(
                    vscode.l10n.t(
                        'Invalid workspace.json: {0}',
                        vscode.l10n.t('Duplicate repository path: {0}', second.relativePath),
                    ),
                );
            }
            if (
                isNestedPath(normalizedCanonicalPaths[i], normalizedCanonicalPaths[j]) ||
                isNestedPath(normalizedCanonicalPaths[j], normalizedCanonicalPaths[i])
            ) {
                throw new Error(
                    vscode.l10n.t(
                        'Invalid workspace.json: {0}',
                        vscode.l10n.t(
                            'Overlapping repository paths: {0} and {1}',
                            first.relativePath,
                            second.relativePath,
                        ),
                    ),
                );
            }
        }
    }
    return repos;
}

async function getWorkspaceContext(root: string): Promise<{ mainRepo: string; repos: RepoEntry[] }> {
    const workspaceRepoRoot = await getWorktreeTopLevel(root);
    const normalizedRoot = path.resolve(root);
    const normalizedRepoRoot = path.resolve(workspaceRepoRoot);
    const isRoot =
        process.platform === 'win32'
            ? normalizedRoot.toLowerCase() === normalizedRepoRoot.toLowerCase()
            : normalizedRoot === normalizedRepoRoot;
    if (!workspaceRepoRoot || !isRoot) {
        throw new Error(vscode.l10n.t('Open the repository root containing workspace.json, not a subfolder.'));
    }

    const mainRepo = await getMainWorktreeRoot(root);
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
    const registeredWorktrees = await Promise.all(
        repos.map(async (repo) => {
            if (!(await isConfiguredRepository(repo))) return new Set<string>();
            try {
                return await getRegisteredWorktreePaths(repo.sourcePath);
            } catch {
                return new Set<string>();
            }
        }),
    );
    const result = await Promise.all(
        worktrees.map(async (entry): Promise<MultiRepositoryWorktreeEntry> => {
            const isMain = normalizeWorktreePath(entry.path) === normalizeWorktreePath(mainRepo);
            const repoStatuses = await Promise.all(
                repos.map(async (repo, index) => {
                    if (isMain) return isConfiguredRepository(repo);
                    const childPath = resolveSafeRelativePath(entry.path, repo.relativePath);
                    return (
                        registeredWorktrees[index].has(normalizeWorktreePath(childPath)) &&
                        (await pathExists(childPath)) &&
                        (await isGitRepository(childPath))
                    );
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
            return !ignoredPaths.some(
                (childPath) => filePath === childPath || filePath.startsWith(childPath + '/'),
            );
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
        const exists = await pathExists(childPath);
        const registered =
            (await isConfiguredRepository(repo)) && (await isRegisteredWorktree(repo.sourcePath, childPath));
        if (registered) {
            if (exists) children.push({ repo, path: childPath });
            continue;
        }
        if (exists) {
            throw new Error(vscode.l10n.t('Path exists but is not a worktree of the configured repository: {0}', repo.relativePath));
        }
    }

    for (const child of children) {
        await assertWorktreeClean(child.path);
    }
    await assertWorktreeClean(entry.path, children.map((child) => child.repo.relativePath));

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
    if (
        !(await isConfiguredRepository(repo)) ||
        !(await isRegisteredWorktree(repo.sourcePath, childPath))
    ) {
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
    const loadState = async () => {
        state = await getMultiRepositoryWorktrees(root);
        return state;
    };

    try {
        showMultiRepositoryWorktreesQuickPick({
            entries: [],
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
