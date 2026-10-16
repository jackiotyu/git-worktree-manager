import { afterEach, describe, expect, it, rs } from '@rstest/core';
import os from 'os';
import path from 'path';
import * as execModule from '@/core/git/exec';
import { getMainWorktreeRoot } from '@/core/git/getMainWorktreeRoot';

rs.mock('@/core/git/exec', () => ({
    execAuto: rs.fn(),
}));

const result = (stdout = '') => ({ stdout, stderr: '', code: 0 });
const testRoot = path.resolve(os.tmpdir(), 'gwm-main-worktree-root');

afterEach(() => {
    rs.clearAllMocks();
});

describe('getMainWorktreeRoot', () => {
    it('resolves the main worktree from a shared .git directory', async () => {
        const cwd = path.join(testRoot, 'feature');
        const commonDir = path.join(testRoot, 'main', '.git');
        rs.mocked(execModule.execAuto).mockResolvedValue(result(commonDir));

        await expect(getMainWorktreeRoot(cwd)).resolves.toBe(path.dirname(commonDir));
        expect(execModule.execAuto).toHaveBeenCalledWith(cwd, ['rev-parse', '--git-common-dir']);
    });

    it('uses the current worktree when the common directory is a bare repository', async () => {
        const cwd = path.join(testRoot, 'worktrees', 'main');
        const commonDir = path.join(testRoot, 'project.git');
        rs.mocked(execModule.execAuto).mockResolvedValue(result(commonDir));

        await expect(getMainWorktreeRoot(cwd)).resolves.toBe(cwd);
    });

    it('returns an empty path when Git cannot resolve the common directory', async () => {
        rs.mocked(execModule.execAuto).mockRejectedValue(new Error('not a Git repository'));

        await expect(getMainWorktreeRoot(testRoot)).resolves.toBe('');
    });
});
