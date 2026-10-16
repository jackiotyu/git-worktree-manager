import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import os from 'os';
import path from 'path';
import { addBranchWorktree } from '@/core/git/addBranchWorktree';
import * as execModule from '@/core/git/exec';
import * as addWorktreeModule from '@/core/git/addWorktree';

rs.mock('@/core/git/exec', () => ({
    execAuto: rs.fn(),
}));

rs.mock('@/core/git/addWorktree', () => ({
    addWorktreeRaw: rs.fn(),
}));

const result = (stdout = '') => ({ stdout, stderr: '', code: 0 });

describe('addBranchWorktree', () => {
    beforeEach(() => {
        rs.clearAllMocks();
        rs.mocked(addWorktreeModule.addWorktreeRaw).mockResolvedValue(undefined);
    });

    it('adds an existing local branch as a worktree', async () => {
        rs.mocked(execModule.execAuto)
            .mockResolvedValueOnce(result())
            .mockResolvedValueOnce(result('origin/feature\norigin/HEAD\n'));

        await addBranchWorktree('/repos/main', '/worktrees/feature', 'feature');

        expect(addWorktreeModule.addWorktreeRaw).toHaveBeenCalledWith(
            '/worktrees/feature',
            'feature',
            true,
            '/repos/main',
        );
        expect(execModule.execAuto).toHaveBeenCalledTimes(2);
    });

    it('uses a unique matching remote branch for an existing branch name', async () => {
        rs.mocked(execModule.execAuto)
            .mockRejectedValueOnce(new Error('no local branch'))
            .mockResolvedValueOnce(result('origin/feature\norigin/HEAD\n'));

        await addBranchWorktree('/repos/main', '/worktrees/feature', 'feature');

        expect(addWorktreeModule.addWorktreeRaw).toHaveBeenCalledWith(
            '/worktrees/feature',
            'feature',
            true,
            '/repos/main',
        );
    });

    it('creates a new branch directly from the selected start point', async () => {
        rs.mocked(execModule.execAuto)
            .mockRejectedValueOnce(new Error('no local branch'))
            .mockResolvedValueOnce(result())
            .mockResolvedValueOnce(result());

        await addBranchWorktree('/repos/main', '/worktrees/feature', 'feature', 'release/2.x');

        expect(execModule.execAuto).toHaveBeenNthCalledWith(3, '/repos/main', [
            'worktree',
            'add',
            '-b',
            'feature',
            '/worktrees/feature',
            'release/2.x',
        ]);
        expect(addWorktreeModule.addWorktreeRaw).not.toHaveBeenCalled();
    });

    it('removes a partially created worktree when checkout fails', async () => {
        const targetPath = path.join(os.tmpdir(), `gwm-partial-worktree-${process.pid}-missing`);
        rs.mocked(execModule.execAuto)
            .mockResolvedValueOnce(result())
            .mockResolvedValueOnce(result())
            .mockResolvedValueOnce(result(`worktree ${targetPath}\\nHEAD abc\\n`))
            .mockResolvedValueOnce(result());
        rs.mocked(addWorktreeModule.addWorktreeRaw).mockRejectedValueOnce(new Error('checkout failed'));

        await expect(addBranchWorktree('/repos/main', targetPath, 'feature')).rejects.toThrow('checkout failed');

        expect(execModule.execAuto).toHaveBeenNthCalledWith(3, '/repos/main', ['worktree', 'list', '--porcelain']);
        expect(execModule.execAuto).toHaveBeenNthCalledWith(4, '/repos/main', [
            'worktree',
            'remove',
            '--force',
            targetPath,
        ]);
    });

    it('rejects ambiguous names matching multiple remotes', async () => {
        rs.mocked(execModule.execAuto)
            .mockRejectedValueOnce(new Error('no local branch'))
            .mockResolvedValueOnce(result('origin/feature\nupstream/feature\n'));

        await expect(addBranchWorktree('/repos/main', '/worktrees/feature', 'feature')).rejects.toThrow(
            'matches multiple remote branches',
        );
        expect(addWorktreeModule.addWorktreeRaw).not.toHaveBeenCalled();
        expect(execModule.execAuto).toHaveBeenCalledTimes(2);
    });
});
