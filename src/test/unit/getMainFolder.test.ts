import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { getMainFolder, clearMainFolderCache } from '../../core/git/getMainFolder';
import * as execBaseModule from '../../core/git/exec-base';

rs.mock('../../core/git/exec-base', () => ({
    execBase: rs.fn(),
}));

describe('getMainFolder and clearMainFolderCache', () => {
    beforeEach(() => {
        clearMainFolderCache();
        rs.clearAllMocks();
    });

    afterEach(() => {
        clearMainFolderCache();
    });

    const ok = (stdout: string) => ({ stdout, stderr: '', code: 0 });

    it('returns normalized main folder path and caches successful result', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockResolvedValue(ok('/repos/my-project/.git\n'));

        const result1 = await getMainFolder('/repos/my-project');
        expect(result1).toBe('/repos/my-project');
        expect(mockExec).toHaveBeenCalledTimes(1);

        // Second call should hit the cache and not call execBase again
        const result2 = await getMainFolder('/repos/my-project');
        expect(result2).toBe('/repos/my-project');
        expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('does not cache when git command throws an error', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockRejectedValueOnce(new Error('Not a git repository'));

        const result1 = await getMainFolder('/not-a-repo');
        expect(result1).toBe('');
        expect(mockExec).toHaveBeenCalledTimes(1);

        // Second call should NOT return cached failure, but attempt to query again
        mockExec.mockResolvedValueOnce(ok('/not-a-repo/.git\n'));
        const result2 = await getMainFolder('/not-a-repo');
        expect(result2).toBe('/not-a-repo');
        expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it('does not cache when git command returns an empty string', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockResolvedValueOnce(ok('  \n'));

        const result1 = await getMainFolder('/empty-result');
        expect(result1).toBe('');
        expect(mockExec).toHaveBeenCalledTimes(1);

        mockExec.mockResolvedValueOnce(ok('/empty-result/.git\n'));
        const result2 = await getMainFolder('/empty-result');
        expect(result2).toBe('/empty-result');
        expect(mockExec).toHaveBeenCalledTimes(2);
    });

    it('clearMainFolderCache clears matching cwd key or mainFolder value', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockImplementation(async (cwd: string) => {
            return ok(`${cwd}/.git\n`);
        });

        await getMainFolder('/repos/repo1');
        await getMainFolder('/repos/repo2');
        expect(mockExec).toHaveBeenCalledTimes(2);

        // Invalidate repo1
        clearMainFolderCache('/repos/repo1');

        // repo2 should still be cached
        await getMainFolder('/repos/repo2');
        expect(mockExec).toHaveBeenCalledTimes(2);

        // repo1 should re-query
        await getMainFolder('/repos/repo1');
        expect(mockExec).toHaveBeenCalledTimes(3);

        // Invalidate all
        clearMainFolderCache();
        await getMainFolder('/repos/repo2');
        expect(mockExec).toHaveBeenCalledTimes(4);
    });
});
