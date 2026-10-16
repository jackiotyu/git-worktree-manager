import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
    getRegisteredWorktreePaths,
    hasConfiguredRemote,
    isMarkedMultiRepositoryWorktree,
    isNestedPath,
    isPathWithinRoot,
    isRegisteredWorktree,
    markMultiRepositoryWorktree,
    normalizeRepositoryPath,
    resolveCanonicalPath,
} from '@/core/util/multiRepositoryWorktree';
import * as execModule from '@/core/git/exec';

rs.mock('@/core/git/exec', () => ({
    execAuto: rs.fn(),
}));

const result = (stdout = '') => ({ stdout, stderr: '', code: 0 });

let tempRoot = '';

describe('multi-repository worktree utilities', () => {
    beforeEach(async () => {
        rs.clearAllMocks();
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gwm-multi-worktree-'));
    });

    afterEach(async () => {
        await fs.rm(tempRoot, { recursive: true, force: true });
    });

    it('lists exact worktree paths from Git metadata', async () => {
        const repo = path.join(tempRoot, 'main');
        const commonDir = path.join(repo, '.git');
        const worktree = path.join(tempRoot, 'feature');
        const adminDir = path.join(commonDir, 'worktrees', 'feature');
        await fs.mkdir(path.join(commonDir, 'worktrees'), { recursive: true });
        await fs.writeFile(path.join(commonDir, 'HEAD'), 'ref: refs/heads/main\n');
        await fs.mkdir(worktree, { recursive: true });
        await fs.mkdir(adminDir, { recursive: true });
        await fs.writeFile(path.join(worktree, '.git'), `gitdir: ${path.relative(worktree, adminDir)}\n`);
        await fs.writeFile(path.join(adminDir, 'gitdir'), path.relative(adminDir, path.join(worktree, '.git')));

        const paths = await getRegisteredWorktreePaths(repo);

        expect(paths.has(normalizeRepositoryPath(repo))).toBe(true);
        expect(paths.has(normalizeRepositoryPath(worktree))).toBe(true);
        expect(paths.has(normalizeRepositoryPath(path.join(tempRoot, 'feature-copy')))).toBe(false);
    });

    it('checks whether a path is registered by its source repository', async () => {
        const repo = path.join(tempRoot, 'main');
        const commonDir = path.join(repo, '.git');
        const worktree = path.join(tempRoot, 'feature');
        const adminDir = path.join(commonDir, 'worktrees', 'feature');
        await fs.mkdir(path.join(commonDir, 'worktrees'), { recursive: true });
        await fs.writeFile(path.join(commonDir, 'HEAD'), 'ref: refs/heads/main\n');
        await fs.mkdir(worktree, { recursive: true });
        await fs.mkdir(adminDir, { recursive: true });
        await fs.writeFile(path.join(worktree, '.git'), `gitdir: ${path.relative(worktree, adminDir)}\n`);
        await fs.writeFile(path.join(adminDir, 'gitdir'), path.relative(adminDir, path.join(worktree, '.git')));

        await expect(isRegisteredWorktree(repo, worktree)).resolves.toBe(true);
        await expect(isRegisteredWorktree(repo, path.join(tempRoot, 'other'))).resolves.toBe(false);
    });

    it('compares repository paths with path boundaries', () => {
        const root = normalizeRepositoryPath(path.join(tempRoot, 'workspace'));
        const child = normalizeRepositoryPath(path.join(tempRoot, 'workspace', 'packages', 'client'));
        const sibling = normalizeRepositoryPath(path.join(tempRoot, 'workspace-copy'));

        expect(isNestedPath(root, child)).toBe(true);
        expect(isNestedPath(root, sibling)).toBe(false);
        expect(isNestedPath(root, root)).toBe(false);
        expect(isPathWithinRoot(root, child)).toBe(true);
        expect(isPathWithinRoot(root, root)).toBe(false);
        expect(isPathWithinRoot(root, sibling)).toBe(false);
    });

    it('resolves missing path suffixes after canonicalizing existing ancestors', async () => {
        const root = path.join(tempRoot, 'workspace');
        await fs.mkdir(root, { recursive: true });

        await expect(resolveCanonicalPath(path.join(root, 'packages', 'client'))).resolves.toBe(
            path.join(await fs.realpath(root), 'packages', 'client'),
        );
    });

    it('resolves paths through directory symlinks', async () => {
        const root = path.join(tempRoot, 'workspace');
        const actual = path.join(root, 'repositories');
        const alias = path.join(root, 'alias');
        await fs.mkdir(actual, { recursive: true });

        try {
            await fs.symlink(actual, alias, 'dir');
        } catch {
            return;
        }

        await expect(resolveCanonicalPath(path.join(alias, 'new-repo'))).resolves.toBe(
            path.join(await fs.realpath(actual), 'new-repo'),
        );
    });

    it('matches equivalent HTTPS and SSH remotes', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue(
            result(
                'origin https://github.com/JackIoTyu/Example.git (fetch)\n' +
                    'origin https://github.com/JackIoTyu/Example.git (push)\n',
            ),
        );

        await expect(hasConfiguredRemote('/repos/example', 'git@github.com:jackiotyu/example.git')).resolves.toBe(true);
        expect(execModule.execAuto).toHaveBeenCalledWith('/repos/example', ['remote', '-v']);
    });

    it('marks a linked worktree in its own Git directory', async () => {
        const worktree = path.join(tempRoot, 'feature');
        const gitDir = path.join(tempRoot, '.git', 'worktrees', 'feature');
        await fs.mkdir(worktree, { recursive: true });
        await fs.mkdir(gitDir, { recursive: true });
        await fs.writeFile(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feature\n');
        await fs.writeFile(path.join(worktree, '.git'), `gitdir: ${path.relative(worktree, gitDir)}\n`);

        await markMultiRepositoryWorktree(worktree);

        expect(await isMarkedMultiRepositoryWorktree(worktree)).toBe(true);
        expect(await isMarkedMultiRepositoryWorktree(path.join(tempRoot, 'unknown'))).toBe(false);
    });
});
