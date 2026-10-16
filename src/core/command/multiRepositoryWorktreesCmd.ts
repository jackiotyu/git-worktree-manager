import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { getBaseWorktreeDir, getSubDir } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';

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
    if (!relativePath || path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
        throw new Error(`Repository path must be relative: ${relativePath}`);
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
        if (!value || typeof value.name !== 'string' || !value.name.trim() ||
            typeof value.remote !== 'string' || !value.remote.trim()) {
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
                throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', `overlapping paths: ${repo.relativePath} and ${other.relativePath}`));
            }
        }
    }
    return { config, repos };
}

async function isGitRepository(repoPath: string): Promise<boolean> {
    try {
        const { stdout } = await execAuto(repoPath, ['rev-parse', '--show-toplevel']);
        const repoRoot = path.resolve(stdout.trim());
        const target = path.resolve(repoPath);
        return process.platform === 'win32'
            ? repoRoot.toLowerCase() === target.toLowerCase()
            : repoRoot === target;
    } catch {
        return false;
    }
}

async function addBranchWorktree(repoPath: string, targetPath: string, branch: string): Promise<void> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const localBranch = await execAuto(repoPath, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`])
        .then(() => true, () => false);
    if (localBranch) {
        await execAuto(repoPath, ['worktree', 'add', targetPath, branch]);
        return;
    }

    const remoteBranches = (await execAuto(repoPath, [
        'for-each-ref', '--format=%(refname:short)', 'refs/remotes',
    ])).stdout.split(/\\r?\\n/).filter((ref) => ref.endsWith(`/${branch}`) && !ref.endsWith('/HEAD'));

    if (remoteBranches.length === 1) {
        await execAuto(repoPath, ['worktree', 'add', '--track', '-b', branch, targetPath, remoteBranches[0]]);
        return;
    }
    if (remoteBranches.length > 1) {
        throw new Error(`Branch "${branch}" matches multiple remote branches in ${repoPath}; specify a unique branch name.`);
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

async function createMultiRepositoryWorktree(root: string, branch: string): Promise<string> {
    const workspaceRepoRoot = (await execAuto(root, ['rev-parse', '--show-toplevel'])).stdout.trim();
    const normalizedRoot = path.resolve(root);
    const normalizedRepoRoot = path.resolve(workspaceRepoRoot);
    const isRoot = process.platform === 'win32'
        ? normalizedRoot.toLowerCase() === normalizedRepoRoot.toLowerCase()
        : normalizedRoot === normalizedRepoRoot;
    if (!isRoot) {
        throw new Error('Open the repository root containing workspace.json, not a subfolder.');
    }
    const mainRepo = await getMainFolder(root);
    if (!mainRepo) throw new Error('Unable to resolve the main repository.');
    const { repos } = await loadConfig(root, mainRepo);
    const parentDir = getBaseWorktreeDir(mainRepo);
    await fs.mkdir(parentDir, { recursive: true });
    let index = 1;
    let targetRoot = '';
    while (true) {
        targetRoot = path.join(parentDir, getSubDir(path.basename(mainRepo), branch.replace(/[\\/]/g, '-'), index));
        if (!(await pathExists(targetRoot))) break;
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

async function getMultiRepositoryWorktrees(root: string): Promise<{ mainRepo: string; entries: WorktreeEntry[] }> {
    const workspaceRepoRoot = (await execAuto(root, ['rev-parse', '--show-toplevel'])).stdout.trim();
    const normalizedRoot = path.resolve(root);
    const normalizedRepoRoot = path.resolve(workspaceRepoRoot);
    const isRoot = process.platform === 'win32'
        ? normalizedRoot.toLowerCase() === normalizedRepoRoot.toLowerCase()
        : normalizedRoot === normalizedRepoRoot;
    if (!isRoot) {
        throw new Error('Open the repository root containing workspace.json, not a subfolder.');
    }
    const mainRepo = await getMainFolder(root);
    if (!mainRepo) throw new Error('Unable to resolve the main repository.');
    const { repos } = await loadConfig(root, mainRepo);
    const entries = (await getWorktrees(mainRepo)).filter((entry) => path.resolve(entry.path) !== path.resolve(mainRepo));
    const result: WorktreeEntry[] = [];
    for (const entry of entries) {
        const complete = await Promise.all(repos.map(async (repo) => {
            const childPath = resolveRepoPath(entry.path, repo.relativePath);
            return pathExists(childPath) && isGitRepository(childPath);
        }));
        if (complete.some(Boolean)) result.push(entry);
    }
    return { mainRepo, entries: result };
}

export async function multiRepositoryWorktreesCmd(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
        void vscode.window.showErrorMessage(vscode.l10n.t('Open a folder containing workspace.json first'));
        return;
    }

    const action = await vscode.window.showQuickPick([
        { label: vscode.l10n.t('Create worktrees'), value: 'create' },
        { label: vscode.l10n.t('Show repository status'), value: 'status' },
        { label: vscode.l10n.t('Open a worktree'), value: 'open' },
        { label: vscode.l10n.t('Remove a worktree'), value: 'remove' },
    ], { title: vscode.l10n.t('Multi-repository workspace') });
    if (!action) return;

    try {
        const mainRepo = await getMainFolder(root);
        if (!mainRepo) throw new Error('Unable to resolve the main repository.');
        await loadConfig(root, mainRepo);
        if (action.value === 'create') {
            const branch = await vscode.window.showInputBox({
                title: vscode.l10n.t('Create worktrees'),
                prompt: vscode.l10n.t('Enter the branch name for the multi-repository worktree'),
                validateInput: (value) => value.trim() ? undefined : 'Branch name cannot be empty',
            });
            if (!branch) return;
            const target = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t('Creating multi-repository worktree'),
                cancellable: false,
            }, () => createMultiRepositoryWorktree(root, branch.trim()));
            void vscode.window.showInformationMessage(vscode.l10n.t('Multi-repository worktree created: {0}', target));
            return;
        }

        const { mainRepo, entries } = await getMultiRepositoryWorktrees(root);
        if (!entries.length) {
            void vscode.window.showInformationMessage(vscode.l10n.t('No multi-repository worktrees found'));
            return;
        }
        if (action.value === 'status') {
            const items = await Promise.all(entries.map(async (entry) => {
                const statuses = await Promise.all(repos.map(async (repo) => {
                    const childPath = resolveRepoPath(entry.path, repo.relativePath);
                    return `${repo.name}: ${await isGitRepository(childPath) ? vscode.l10n.t('Ready') : vscode.l10n.t('Missing')}`;
                }));
                return { label: entry.branch, description: entry.path, detail: statuses.join(' · '), entry };
            }));
            await vscode.window.showQuickPick(items, { title: vscode.l10n.t('Show repository status'), matchOnDescription: true, matchOnDetail: true });
            return;
        }

        const selected = await vscode.window.showQuickPick(entries.map((entry) => ({
            label: entry.branch, description: entry.path, entry,
        })), { title: action.value === 'open' ? vscode.l10n.t('Open a worktree') : vscode.l10n.t('Remove a worktree') });
        if (!selected) return;
        if (action.value === 'open') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selected.entry.path), {
                forceNewWindow: false,
                forceReuseWindow: true,
            });
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            vscode.l10n.t('Remove the multi-repository worktree {0}?', selected.entry.path),
            { modal: true },
            vscode.l10n.t('Remove'),
        );
        if (!confirmation) return;
        for (const repo of repos) {
            const childPath = resolveRepoPath(selected.entry.path, repo.relativePath);
            if (await isGitRepository(childPath)) {
                await execAuto(repo.sourcePath, ['worktree', 'remove', childPath]);
            }
        }
        await execAuto(mainRepo, ['worktree', 'remove', selected.entry.path]);
        void vscode.window.showInformationMessage(vscode.l10n.t('Multi-repository worktree removed: {0}', selected.entry.path));
    } catch (error) {
        Alert.showErrorMessage(String(error));
    }
}
