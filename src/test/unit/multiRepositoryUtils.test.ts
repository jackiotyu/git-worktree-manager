import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { pathExists } from '../../core/util/fs';
import { hasGitMetadata, isGitRepository } from '../../core/util/repo';
import * as topLevelModule from '@/core/git/getWorktreeTopLevel';

rs.mock('@/core/git/getWorktreeTopLevel', () => ({
    getWorktreeTopLevel: rs.fn(),
}));

let fsTempRoot = '';
let repoTempRoot = '';

describe('pathExists', () => {
    beforeEach(async () => {
        fsTempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gwm-fs-'));
    });

    afterEach(async () => {
        await fs.rm(fsTempRoot, { recursive: true, force: true });
    });

    it('returns true for existing files and directories', async () => {
        const directory = path.join(fsTempRoot, 'repo');
        const file = path.join(directory, 'README.md');
        await fs.mkdir(directory);
        await fs.writeFile(file, 'test');

        expect(await pathExists(directory)).toBe(true);
        expect(await pathExists(file)).toBe(true);
    });

    it('returns false for missing paths', async () => {
        expect(await pathExists(path.join(fsTempRoot, 'missing'))).toBe(false);
    });
});

describe('Git repository metadata utilities', () => {
    beforeEach(async () => {
        rs.clearAllMocks();
        repoTempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gwm-repo-'));
    });

    afterEach(async () => {
        await fs.rm(repoTempRoot, { recursive: true, force: true });
    });

    it('recognizes a repository with a .git directory and HEAD file', async () => {
        const repo = path.join(repoTempRoot, 'repo');
        const gitDir = path.join(repo, '.git');
        await fs.mkdir(gitDir, { recursive: true });
        await fs.writeFile(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');

        expect(await hasGitMetadata(repo)).toBe(true);
    });

    it('rejects incomplete .git directories', async () => {
        const repo = path.join(repoTempRoot, 'repo');
        await fs.mkdir(path.join(repo, '.git'), { recursive: true });

        expect(await hasGitMetadata(repo)).toBe(false);
    });

    it('recognizes linked worktrees whose .git file points to a git directory', async () => {
        const worktree = path.join(repoTempRoot, 'worktree');
        const gitDir = path.join(repoTempRoot, '.git', 'worktrees', 'worktree');
        await fs.mkdir(worktree, { recursive: true });
        await fs.mkdir(gitDir, { recursive: true });
        await fs.writeFile(path.join(gitDir, 'HEAD'), 'ref: refs/heads/feature/test\n');
        await fs.writeFile(path.join(worktree, '.git'), `gitdir: ${path.relative(worktree, gitDir)}\n`);

        expect(await hasGitMetadata(worktree)).toBe(true);
    });

    it('rejects malformed or dangling .git files', async () => {
        const malformed = path.join(repoTempRoot, 'malformed');
        const dangling = path.join(repoTempRoot, 'dangling');
        await fs.mkdir(malformed);
        await fs.mkdir(dangling);
        await fs.writeFile(path.join(malformed, '.git'), 'not a gitdir pointer\n');
        await fs.writeFile(path.join(dangling, '.git'), 'gitdir: .git/worktrees/missing\n');

        expect(await hasGitMetadata(malformed)).toBe(false);
        expect(await hasGitMetadata(dangling)).toBe(false);
    });

    it('requires the path itself to be the Git worktree root', async () => {
        const repo = path.join(repoTempRoot, 'repo');
        const nested = path.join(repo, 'src');
        await fs.mkdir(nested, { recursive: true });
        rs.mocked(topLevelModule.getWorktreeTopLevel).mockResolvedValue(repo);

        expect(await isGitRepository(repo)).toBe(true);
        expect(await isGitRepository(nested)).toBe(false);
    });

    it('returns false when Git cannot resolve a worktree root', async () => {
        rs.mocked(topLevelModule.getWorktreeTopLevel).mockResolvedValue('');

        expect(await isGitRepository(path.join(repoTempRoot, 'missing'))).toBe(false);
    });
});
