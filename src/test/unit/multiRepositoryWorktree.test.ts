import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
    getRegisteredWorktreePaths,
    hasConfiguredRemote,
    isMarkedMultiRepositoryWorktree,
    isRegisteredWorktree,
    markMultiRepositoryWorktree,
    normalizeWorktreePath,
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

    it('lists exact worktree paths from porcelain output', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue(
            result(
                'worktree /repos/main\nHEAD abc\nbranch refs/heads/main\n\n' +
                    'worktree /repos/feature\nHEAD def\nbranch refs/heads/feature\n',
            ),
        );

        const paths = await getRegisteredWorktreePaths('/repos/main');

        expect(paths.has(normalizeWorktreePath('/repos/main'))).toBe(true);
        expect(paths.has(normalizeWorktreePath('/repos/feature'))).toBe(true);
        expect(paths.has(normalizeWorktreePath('/repos/feature-copy'))).toBe(false);
    });

    it('checks whether a path is registered by its source repository', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue(
            result('worktree /repos/main\nHEAD abc\n\nworktree /repos/feature\nHEAD def\n'),
        );

        await expect(isRegisteredWorktree('/repos/main', '/repos/feature')).resolves.toBe(true);
        await expect(isRegisteredWorktree('/repos/main', '/repos/other')).resolves.toBe(false);
    });

    it('matches equivalent HTTPS and SSH remotes', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue(
            result(
                'origin https://github.com/JackIoTyu/Example.git (fetch)\n' +
                    'origin https://github.com/JackIoTyu/Example.git (push)\n',
            ),
        );

        await expect(hasConfiguredRemote('/repos/example', 'git@github.com:jackiotyu/example.git')).resolves.toBe(
            true,
        );
        expect(execModule.execAuto).toHaveBeenCalledWith('/repos/example', ['remote', '-v']);
    });

    it('marks a linked worktree in its own Git directory', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (cwd, args) => {
            if (args?.[0] === 'rev-parse') {
                return result(cwd === '/worktrees/feature' ? tempRoot : path.join(tempRoot, 'unknown-git-dir'));
            }
            return result();
        });

        await markMultiRepositoryWorktree('/worktrees/feature');

        expect(await isMarkedMultiRepositoryWorktree('/worktrees/feature')).toBe(true);
        expect(await isMarkedMultiRepositoryWorktree('/worktrees/unknown')).toBe(false);
    });
});
