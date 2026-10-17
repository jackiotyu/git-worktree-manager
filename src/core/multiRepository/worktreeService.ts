import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { addBranchWorktree } from '@/core/git/addBranchWorktree';
import { getWorktrees } from '@/core/git/getWorktrees';
import { getMainWorktreeRoot } from '@/core/git/getMainWorktreeRoot';
import { pathExists } from '@/core/util/fs';
import { resolveSafeRelativePath } from '@/core/util/path';
import { hasGitMetadata, isGitRepository } from '@/core/util/repo';
import { loadConfig } from '@/core/util/workspaceConfig';
import type { RepoEntry } from '@/types';
import {
    hasConfiguredRemote,
    isMarkedMultiRepositoryWorktree,
    isRegisteredWorktree,
    markMultiRepositoryWorktree,
    normalizeRepositoryPath,
} from '@/core/util/multiRepositoryWorktree';

export interface MultiRepositoryWorktreeEntry {
    path: string;
    branch: string;
    isMain: boolean;
    isMultiRepository: boolean;
    repoStatuses: boolean[];
}

async function isConfiguredRepository(repo: RepoEntry): Promise<boolean> {
    try {
        return (
            (await isGitRepository(repo.sourcePath)) &&
            (!repo.remote || (await hasConfiguredRemote(repo.sourcePath, repo.remote)))
        );
    } catch {
        return false;
    }
}

async function ensureRepositorySource(repo: RepoEntry, cloneCwd: string): Promise<void> {
    if (!(await pathExists(repo.sourcePath))) {
        if (!repo.remote) {
            throw new Error(
                vscode.l10n.t('Repository source does not exist and no remote is configured: {0}', repo.relativePath),
            );
        }
        await fs.mkdir(path.dirname(repo.sourcePath), { recursive: true });
        await execAuto(cloneCwd, ['clone', '--', repo.remote, repo.sourcePath]);
    }

    if (!(await isGitRepository(repo.sourcePath))) {
        throw new Error(vscode.l10n.t('Configured path exists but is not a Git repository: {0}', repo.relativePath));
    }
    if (repo.remote && !(await hasConfiguredRemote(repo.sourcePath, repo.remote))) {
        throw new Error(vscode.l10n.t('Configured repository remote does not match: {0}', repo.relativePath));
    }
}

export async function getWorkspaceContext(root: string): Promise<{ mainRepo: string; repos: RepoEntry[] }> {
    if (!(await hasGitMetadata(root))) {
        throw new Error(vscode.l10n.t('Open the repository root containing gwm.json, not a subfolder.'));
    }

    const mainRepo = await getMainWorktreeRoot(root);
    if (!mainRepo) throw new Error(vscode.l10n.t('Unable to resolve the main repository.'));
    const repos = await loadConfig(root, mainRepo);
    return { mainRepo, repos };
}

export async function createMultiRepositoryWorktree(
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

export async function getMultiRepositoryWorktrees(
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

export async function completeMultiRepositoryWorktree(
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

export async function removeMultiRepositoryWorktree(
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

export async function removeChildRepositoryWorktree(
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

interface BranchWorktree {
    repoPath: string;
    worktreePath: string;
    label: string;
}

function getBranchWorktrees(
    mainRepo: string,
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
): BranchWorktree[] {
    if (entry.repoStatuses.some((exists) => !exists)) {
        throw new Error(vscode.l10n.t('Complete all child repositories before switching branches.'));
    }
    return [
        { repoPath: mainRepo, worktreePath: entry.path, label: path.basename(entry.path) },
        ...repos.map((repo) => ({
            repoPath: repo.sourcePath,
            worktreePath: entry.isMain ? repo.sourcePath : resolveSafeRelativePath(entry.path, repo.relativePath),
            label: repo.relativePath,
        })),
    ];
}

async function getLocalBranches(worktreePath: string): Promise<Set<string>> {
    const { stdout } = await execAuto(worktreePath, ['branch', '--format=%(refname:short)']);
    return new Set(
        stdout
            .split(/\r?\n/)
            .map((branch) => branch.trim())
            .filter(Boolean),
    );
}

async function getBranchesCheckedOutElsewhere(repoPath: string, worktreePath: string): Promise<Map<string, string>> {
    const { stdout } = await execAuto(repoPath, ['worktree', 'list', '--porcelain']);
    const branches = new Map<string, string>();
    let listedPath = '';
    for (const line of stdout.split(/\r?\n/)) {
        if (line.startsWith('worktree ')) {
            listedPath = line.slice('worktree '.length);
        } else if (
            line.startsWith('branch refs/heads/') &&
            normalizeRepositoryPath(listedPath) !== normalizeRepositoryPath(worktreePath)
        ) {
            branches.set(line.slice('branch refs/heads/'.length), listedPath);
        }
    }
    return branches;
}

async function assertBranchNotCheckedOutElsewhere(
    repoPath: string,
    worktreePath: string,
    branch: string,
): Promise<void> {
    const listedPath = (await getBranchesCheckedOutElsewhere(repoPath, worktreePath)).get(branch);
    if (listedPath) {
        throw new Error(
            vscode.l10n.t('Branch {0} is already checked out in another worktree: {1}', branch, listedPath),
        );
    }
}

export async function getCommonMultiRepositoryBranches(
    mainRepo: string,
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
): Promise<string[]> {
    const worktrees = getBranchWorktrees(mainRepo, repos, entry);
    const branchLists = await Promise.all(worktrees.map(({ worktreePath }) => getLocalBranches(worktreePath)));
    const commonBranches = [...branchLists[0]].filter((branch) =>
        branchLists.every((branches) => branches.has(branch)),
    );
    const checkedOutBranches = await Promise.all(
        worktrees.map(({ repoPath, worktreePath }) => getBranchesCheckedOutElsewhere(repoPath, worktreePath)),
    );
    return commonBranches.filter((branch) => checkedOutBranches.every((branches) => !branches.has(branch))).sort();
}

export async function switchMultiRepositoryWorktreeBranch(
    mainRepo: string,
    repos: RepoEntry[],
    entry: MultiRepositoryWorktreeEntry,
    branch: string,
): Promise<void> {
    const worktrees = getBranchWorktrees(mainRepo, repos, entry);
    for (const { worktreePath } of worktrees) {
        await execAuto(worktreePath, ['check-ref-format', '--branch', branch]);
    }

    await assertWorktreeClean(
        entry.path,
        repos.map((repo) => repo.relativePath),
    );
    for (const { worktreePath } of worktrees.slice(1)) await assertWorktreeClean(worktreePath);

    const branchLists = await Promise.all(worktrees.map(({ worktreePath }) => getLocalBranches(worktreePath)));
    const existingCount = branchLists.filter((branches) => branches.has(branch)).length;
    if (existingCount > 0 && existingCount < worktrees.length) {
        throw new Error(
            vscode.l10n.t('Branch {0} exists in only some repositories. No repositories were changed.', branch),
        );
    }

    const create = existingCount === 0;
    if (create) {
        for (const { worktreePath, label } of worktrees) {
            const { stdout } = await execAuto(worktreePath, ['branch', '--show-current']);
            if (!stdout.trim()) {
                throw new Error(vscode.l10n.t('Cannot create a branch from detached HEAD in {0}.', label));
            }
        }
    } else {
        await Promise.all(
            worktrees.map(({ repoPath, worktreePath }) =>
                assertBranchNotCheckedOutElsewhere(repoPath, worktreePath, branch),
            ),
        );
    }

    const changed: string[] = [];
    for (const { worktreePath, label } of worktrees) {
        try {
            await execAuto(worktreePath, create ? ['switch', '-c', branch] : ['switch', branch]);
            changed.push(label);
        } catch (error) {
            throw new Error(
                changed.length
                    ? vscode.l10n.t(
                          'Branch operation partially completed for {0}. Updated: {1}. Failed at {2}: {3}',
                          branch,
                          changed.join(', '),
                          label,
                          String(error),
                      )
                    : vscode.l10n.t('Unable to switch to branch {0} in {1}: {2}', branch, label, String(error)),
            );
        }
    }
}
