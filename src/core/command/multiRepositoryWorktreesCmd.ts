import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { getBaseWorktreeDir, getSubDir } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';
import { Commands } from '@/constants';
import {
    backButton,
    openInCurrentWindowQuickInputButton,
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    createMultiRepositoryWorktreeQuickInputButton,
    removeMultiRepositoryWorktreeQuickInputButton,
    completeRepositoriesQuickInputButton,
    removeChildRepositoryQuickInputButton,
} from '@/core/quickPick/quickPick.button';

interface WorkspaceRepo {
    name: string;
    remote: string;
}

interface WorkspaceConfig {
    version: 1;
    repo: Record<string, WorkspaceRepo>;
}

interface RepoEntry {
    relativePath: string;
    name: string;
    remote: string;
    sourcePath: string;
}

interface WorktreeEntry {
    path: string;
    branch: string;
}

interface MultiRepositoryWorktreeEntry extends WorktreeEntry {
    isMain: boolean;
    repoStatuses: boolean[];
}

interface MultiRepositoryWorktreePickItem extends vscode.QuickPickItem {
    entry: MultiRepositoryWorktreeEntry;
    buttons: vscode.QuickInputButton[];
}

const configFileName = 'workspace.json';

async function pathExists(target: string): Promise<boolean> {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

function resolveRepoPath(root: string, relativePath: string): string {
    const segments = relativePath.split(/[\\/]/);
    if (
        !relativePath ||
        path.isAbsolute(relativePath) ||
        path.win32.isAbsolute(relativePath) ||
        path.win32.parse(relativePath).root ||
        segments.includes('..')
    ) {
        throw new Error(`Repository path must be a safe relative path: ${relativePath}`);
    }
    const resolved = path.resolve(root, relativePath);
    const relative = path.relative(root, resolved);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Repository path escapes the workspace root: ${relativePath}`);
    }
    return resolved;
}

async function loadConfig(root: string, sourceRoot = root): Promise<{ config: WorkspaceConfig; repos: RepoEntry[] }> {
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
        throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', 'expected version 1 and a repo object'));
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
            throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', `invalid repo entry: ${relativePath}`));
        }
        const sourcePath = resolveRepoPath(sourceRoot, relativePath);
        const normalized = process.platform === 'win32' ? sourcePath.toLowerCase() : sourcePath;
        if (seenPaths.has(normalized)) {
            throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', `duplicate path: ${relativePath}`));
        }
        seenPaths.add(normalized);
        repos.push({ relativePath, name: value.name, remote: value.remote, sourcePath });
    }
    if (!repos.length) throw new Error(vscode.l10n.t('No repositories are configured in workspace.json'));

    for (const repo of repos) {
        for (const other of repos) {
            if (repo === other) continue;
            const relative = path.relative(repo.sourcePath, other.sourcePath);
            if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
                throw new Error(
                    vscode.l10n.t(
                        'Invalid workspace.json: {0}',
                        `overlapping paths: ${repo.relativePath} and ${other.relativePath}`,
                    ),
                );
            }
        }
    }
    return { config, repos };
}

async function getWorkspaceContext(root: string): Promise<{ mainRepo: string; repos: RepoEntry[] }> {
    const workspaceRepoRoot = (await execAuto(root, ['rev-parse', '--show-toplevel'])).stdout.trim();
    const normalizedRoot = path.resolve(root);
    const normalizedRepoRoot = path.resolve(workspaceRepoRoot);
    const isRoot =
        process.platform === 'win32'
            ? normalizedRoot.toLowerCase() === normalizedRepoRoot.toLowerCase()
            : normalizedRoot === normalizedRepoRoot;
    if (!isRoot) {
        throw new Error('Open the repository root containing workspace.json, not a subfolder.');
    }

    const mainRepo = await getMainFolder(root);
    if (!mainRepo) throw new Error('Unable to resolve the main repository.');
    const { repos } = await loadConfig(root, mainRepo);
    return { mainRepo, repos };
}

async function isGitRepository(repoPath: string): Promise<boolean> {
    try {
        const { stdout } = await execAuto(repoPath, ['rev-parse', '--show-toplevel']);
        const repoRoot = path.resolve(stdout.trim());
        const target = path.resolve(repoPath);
        return process.platform === 'win32' ? repoRoot.toLowerCase() === target.toLowerCase() : repoRoot === target;
    } catch {
        return false;
    }
}

async function isGitRepositoryPresent(repoPath: string): Promise<boolean> {
    try {
        const [repoStat, gitStat] = await Promise.all([fs.stat(repoPath), fs.stat(path.join(repoPath, '.git'))]);
        return repoStat.isDirectory() && (gitStat.isFile() || gitStat.isDirectory());
    } catch {
        return false;
    }
}

async function addBranchWorktree(repoPath: string, targetPath: string, branch: string): Promise<void> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const localBranch = await execAuto(repoPath, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).then(
        () => true,
        () => false,
    );
    if (localBranch) {
        await execAuto(repoPath, ['worktree', 'add', targetPath, branch]);
        return;
    }

    const remoteBranches = (
        await execAuto(repoPath, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes'])
    ).stdout
        .split(/\r?\n/)
        .filter((ref) => ref.endsWith(`/${branch}`) && !ref.endsWith('/HEAD'));

    if (remoteBranches.length === 1) {
        await execAuto(repoPath, ['worktree', 'add', '--track', '-b', branch, targetPath, remoteBranches[0]]);
        return;
    }
    if (remoteBranches.length > 1) {
        throw new Error(
            `Branch "${branch}" matches multiple remote branches in ${repoPath}; specify a unique branch name.`,
        );
    }

    await execAuto(repoPath, ['worktree', 'add', '-b', branch, targetPath]);
}

async function getWorktrees(repoPath: string): Promise<WorktreeEntry[]> {
    const { stdout } = await execAuto(repoPath, ['worktree', 'list', '--porcelain']);
    const entries: WorktreeEntry[] = [];
    for (const block of stdout.trim().split(/\n\s*\n/)) {
        const worktreePath = block.match(/^worktree (.+)$/m)?.[1];
        const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] || '';
        if (worktreePath && branch) entries.push({ path: worktreePath, branch });
    }
    return entries;
}

async function createMultiRepositoryWorktree(
    root: string,
    branch: string,
    selectedRepoPaths: string[],
): Promise<string> {
    const { mainRepo, repos: configuredRepos } = await getWorkspaceContext(root);
    const selectedPaths = new Set(selectedRepoPaths);
    const repos = configuredRepos.filter((repo) => selectedPaths.has(repo.relativePath));
    const parentDir = getBaseWorktreeDir(mainRepo);
    await fs.mkdir(parentDir, { recursive: true });
    let index = 1;
    let targetRoot: string;
    while (true) {
        const candidate = path.join(
            parentDir,
            getSubDir(path.basename(mainRepo), branch.replace(/[\\/]/g, '-'), index),
        );
        if (!(await pathExists(candidate))) {
            targetRoot = candidate;
            break;
        }
        index += 1;
    }

    const created: Array<{ repoPath: string; worktreePath: string }> = [];
    let parentCreated = false;
    try {
        await addBranchWorktree(mainRepo, targetRoot, branch);
        parentCreated = true;
        for (const repo of repos) {
            if (!(await pathExists(repo.sourcePath))) {
                await fs.mkdir(path.dirname(repo.sourcePath), { recursive: true });
                await execAuto(root, ['clone', '--', repo.remote, repo.sourcePath]);
            } else if (!(await isGitRepository(repo.sourcePath))) {
                throw new Error(`Configured path exists but is not a Git repository: ${repo.relativePath}`);
            }
            const targetPath = resolveRepoPath(targetRoot, repo.relativePath);
            if (await pathExists(targetPath)) {
                throw new Error(`Target path already exists: ${targetPath}`);
            }
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
            const isMain =
                process.platform === 'win32'
                    ? path.resolve(entry.path).toLowerCase() === path.resolve(mainRepo).toLowerCase()
                    : path.resolve(entry.path) === path.resolve(mainRepo);
            return {
                ...entry,
                isMain,
                repoStatuses: await Promise.all(
                    repos.map((repo) =>
                        isGitRepositoryPresent(
                            isMain ? repo.sourcePath : resolveRepoPath(entry.path, repo.relativePath),
                        ),
                    ),
                ),
            };
        }),
    );
    return { mainRepo, repos, entries: result.filter((entry) => entry.isMain || entry.repoStatuses.some(Boolean)) };
}

function createWorktreePickItem(entry: MultiRepositoryWorktreeEntry): MultiRepositoryWorktreePickItem {
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
            ...(openExternalTerminalQuickInputButton.enabled ? [openExternalTerminalQuickInputButton] : []),
            ...(openTerminalQuickInputButton.enabled ? [openTerminalQuickInputButton] : []),
            ...(entry.isMain
                ? []
                : [
                      removeMultiRepositoryWorktreeQuickInputButton,
                      completeRepositoriesQuickInputButton,
                      removeChildRepositoryQuickInputButton,
                  ]),
            openInCurrentWindowQuickInputButton,
        ].filter((button) => button.enabled),
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
        button === openExternalTerminalQuickInputButton
            ? Commands.openExternalTerminalContext
            : Commands.openTerminal;
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
            if (!(await pathExists(repo.sourcePath))) {
                await fs.mkdir(path.dirname(repo.sourcePath), { recursive: true });
                await execAuto(entry.path, ['clone', '--', repo.remote, repo.sourcePath]);
            } else if (!(await isGitRepository(repo.sourcePath))) {
                throw new Error(`Configured path exists but is not a Git repository: ${repo.relativePath}`);
            }

            const targetPath = resolveRepoPath(entry.path, repo.relativePath);
            if (await pathExists(targetPath)) {
                throw new Error(`Target path already exists: ${targetPath}`);
            }
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

async function removeMultiRepositoryWorktree(
    mainRepo: string,
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
): Promise<void> {
    if (entry.isMain) {
        throw new Error('The main worktree cannot be removed.');
    }
    for (const repo of repos) {
        const childPath = resolveRepoPath(entry.path, repo.relativePath);
        if (await isGitRepository(childPath)) {
            await execAuto(repo.sourcePath, ['worktree', 'remove', childPath]);
        }
    }
    await execAuto(mainRepo, ['worktree', 'remove', entry.path]);
}

async function removeChildRepositoryWorktree(
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
    relativePath: string,
): Promise<void> {
    const repo = repos.find((item) => item.relativePath === relativePath);
    if (!repo) throw new Error(`Repository is not configured: ${relativePath}`);

    const childPath = resolveRepoPath(entry.path, repo.relativePath);
    if (!(await isGitRepository(childPath))) {
        throw new Error(`No generated worktree found for repository: ${repo.relativePath}`);
    }
    await execAuto(repo.sourcePath, ['worktree', 'remove', childPath]);
}

async function pickRepositoriesWithBackButton(
    repos: RepoEntry[],
    options: { title: string; placeHolder: string; canSelectMany: boolean },
): Promise<RepoEntry[] | undefined> {
    return new Promise((resolve) => {
        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { repo: RepoEntry }>();
        let resolved = false;
        const finish = (selected?: RepoEntry[]) => {
            if (resolved) return;
            resolved = true;
            quickPick.hide();
            quickPick.dispose();
            resolve(selected);
        };

        quickPick.title = options.title;
        quickPick.placeholder = options.placeHolder;
        quickPick.buttons = [backButton];
        quickPick.canSelectMany = options.canSelectMany;
        quickPick.ignoreFocusOut = true;
        quickPick.items = repos.map((repo) => ({
            label: repo.name,
            description: repo.relativePath,
            detail: repo.remote,
            repo,
        }));
        quickPick.onDidTriggerButton((button) => {
            if (button === backButton) finish();
        });
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems.map((item) => item.repo);
            finish(selected.length ? selected : undefined);
        });
        quickPick.onDidHide(() => finish());
        quickPick.show();
    });
}

async function createMultiRepositoryWorktreeFromWorkspace(root: string): Promise<void> {
    const { repos } = await getWorkspaceContext(root);
    const selectedRepos = await vscode.window.showQuickPick(
        repos.map((repo) => ({
            label: repo.name,
            description: repo.relativePath,
            detail: repo.remote,
            relativePath: repo.relativePath,
        })),
        {
            title: vscode.l10n.t('Create Multi-Repository Worktree'),
            placeHolder: vscode.l10n.t('Select repositories to include in this worktree'),
            canPickMany: true,
            ignoreFocusOut: true,
        },
    );
    if (!selectedRepos?.length) return;

    const branch = await vscode.window.showInputBox({
        title: vscode.l10n.t('Create Multi-Repository Worktree'),
        prompt: vscode.l10n.t('Enter the branch name for the multi-repository worktree'),
        validateInput: (value) => (value.trim() ? undefined : 'Branch name cannot be empty'),
    });
    if (!branch) return;
    const selectedRepoPaths = selectedRepos.map((repo) => repo.relativePath);
    const target = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Creating multi-repository worktree'),
            cancellable: false,
        },
        () => createMultiRepositoryWorktree(root, branch.trim(), selectedRepoPaths),
    );
    void vscode.window.showInformationMessage(vscode.l10n.t('Multi-repository worktree created: {0}', target));
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

    try {
        const { mainRepo, repos, entries } = await getMultiRepositoryWorktrees(root);

        const quickPick = vscode.window.createQuickPick<MultiRepositoryWorktreePickItem>();
        quickPick.title = vscode.l10n.t('Multi-Repository Worktrees');
        quickPick.buttons = [createMultiRepositoryWorktreeQuickInputButton];
        quickPick.placeholder = vscode.l10n.t('Select a worktree to open in a new window');
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.items = entries.map(createWorktreePickItem);

        const disposables: vscode.Disposable[] = [];
        const refreshItems = async () => {
            const updated = await getMultiRepositoryWorktrees(root);
            quickPick.items = updated.entries.map(createWorktreePickItem);
        };

        disposables.push(
            quickPick.onDidTriggerButton(async (button) => {
                if (button !== createMultiRepositoryWorktreeQuickInputButton) return;
                quickPick.hide();
                try {
                    await createMultiRepositoryWorktreeFromWorkspace(root);
                    await multiRepositoryWorktreesCmd();
                } catch (error) {
                    Alert.showErrorMessage(String(error));
                }
            }),
            quickPick.onDidAccept(async () => {
                const selected = quickPick.selectedItems[0];
                if (!selected) return;
                quickPick.hide();
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selected.entry.path), {
                    forceNewWindow: true,
                });
            }),
            quickPick.onDidTriggerItemButton(async (event) => {
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
                    Alert.showErrorMessage(String(error));
                }
            }),
            quickPick.onDidHide(() => {
                quickPick.dispose();
                disposables.forEach((disposable) => disposable.dispose());
            }),
        );
        quickPick.show();
    } catch (error) {
        Alert.showErrorMessage(String(error));
    }
}
