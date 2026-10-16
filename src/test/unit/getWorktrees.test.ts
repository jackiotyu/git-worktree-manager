import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { getWorktrees } from '@/core/git/getWorktrees';
import * as execModule from '@/core/git/exec';

rs.mock('@/core/git/exec', () => ({
    execAuto: rs.fn(),
}));

describe('getWorktrees', () => {
    beforeEach(() => {
        rs.clearAllMocks();
    });

    it('parses branch worktrees and ignores detached entries', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue({
            stdout: [
                'worktree /repos/main',
                'HEAD abc123',
                'branch refs/heads/main',
                '',
                'worktree /repos/feature',
                'HEAD def456',
                'branch refs/heads/feature/login',
                '',
                'worktree /repos/detached',
                'HEAD 987654',
                'detached',
                '',
                'worktree /repos/bare',
                'bare',
            ].join('\n'),
            stderr: '',
            code: 0,
        });

        await expect(getWorktrees('/repos/main')).resolves.toEqual([
            { path: '/repos/main', branch: 'main' },
            { path: '/repos/feature', branch: 'feature/login' },
        ]);
        expect(execModule.execAuto).toHaveBeenCalledWith('/repos/main', ['worktree', 'list', '--porcelain']);
    });

    it('returns an empty list when there are no worktrees with branches', async () => {
        rs.mocked(execModule.execAuto).mockResolvedValue({
            stdout: '   \n',
            stderr: '',
            code: 0,
        });

        await expect(getWorktrees('/repos/main')).resolves.toEqual([]);
    });
});
