import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { getWorktreeList } from '../../core/git/getWorktreeList';
import * as execBaseModule from '../../core/git/exec-base';

rs.mock('vscode', () => ({
    workspace: {
        getConfiguration: () => ({
            get: (key: string, defaultValue: any) => defaultValue,
        }),
    },
    window: {
        createOutputChannel: () => ({
            appendLine: () => {},
            append: () => {},
            show: () => {},
            dispose: () => {},
            error: () => {},
            info: () => {},
            trace: () => {},
            warn: () => {},
        }),
    },
    l10n: {
        t: (message: string, ...args: any[]) => message.replace('{0}', args[0]),
    },
}));

rs.mock('../../core/git/exec-base', () => ({
    execBase: rs.fn(),
}));

rs.mock('../../core/git/getNameRev', () => ({
    getNameRev: rs.fn().mockResolvedValue(''),
}));

rs.mock('../../core/folderRoot', () => ({
    default: {
        uri: { fsPath: '/test/repo' },
    },
}));

describe('getWorktreeList', () => {
    beforeEach(() => {
        rs.clearAllMocks();
    });

    it('fetches lastCommitDate by default and only queries track info for worktree branches', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockImplementation(async (cwd: string, args?: string[]) => {
            const command = args?.[0];
            if (command === 'worktree') {
                return {
                    stdout: [
                        'worktree /test/repo',
                        'HEAD 1111111111111111111111111111111111111111',
                        'branch refs/heads/main',
                        '',
                        'worktree /test/repo/feature',
                        'HEAD 2222222222222222222222222222222222222222',
                        'branch refs/heads/feature',
                        '',
                    ].join('\n'),
                    stderr: '',
                    code: 0,
                };
            }
            if (command === 'rev-parse' && args?.includes('--git-common-dir')) {
                return { stdout: '/test/repo/.git\n', stderr: '', code: 0 };
            }
            if (command === 'log') {
                return {
                    stdout: [
                        '1111111111111111111111111111111111111111 2026-09-23T10:00:00.000Z',
                        '2222222222222222222222222222222222222222 2026-09-23T11:00:00.000Z',
                    ].join('\n'),
                    stderr: '',
                    code: 0,
                };
            }
            if (command === 'for-each-ref') {
                // Verify that only the worktree branches are queried
                expect(args).toContain('refs/heads/main');
                expect(args).toContain('refs/heads/feature');
                return {
                    stdout: ['main|origin/main|', 'feature|origin/feature|ahead 1, behind 2'].join('\n'),
                    stderr: '',
                    code: 0,
                };
            }
            return { stdout: '', stderr: '', code: 0 };
        });

        const list = await getWorktreeList('/test/repo');
        expect(list).toHaveLength(2);

        // Verify lastCommitDate is present by default
        expect(list[0].lastCommitDate).toBe('2026-09-23T10:00:00.000Z');
        expect(list[1].lastCommitDate).toBe('2026-09-23T11:00:00.000Z');

        // Verify branch track info
        expect(list[0].upstream).toBe('origin/main');
        expect(list[1].ahead).toBe(1);
        expect(list[1].behind).toBe(2);

        // Verify for-each-ref was called instead of git branch
        const calledCommands = mockExec.mock.calls.map((call) => call[1]?.[0]);
        expect(calledCommands).toContain('for-each-ref');
        expect(calledCommands).not.toContain('branch');
    });

    it('skips commit dates when needLastCommitDate is explicitly false', async () => {
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockImplementation(async (cwd: string, args?: string[]) => {
            const command = args?.[0];
            if (command === 'worktree') {
                return {
                    stdout: [
                        'worktree /test/repo',
                        'HEAD 1111111111111111111111111111111111111111',
                        'branch refs/heads/main',
                        '',
                    ].join('\n'),
                    stderr: '',
                    code: 0,
                };
            }
            if (command === 'rev-parse') {
                return { stdout: '/test/repo/.git\n', stderr: '', code: 0 };
            }
            if (command === 'for-each-ref') {
                return { stdout: 'main|origin/main|\n', stderr: '', code: 0 };
            }
            return { stdout: '', stderr: '', code: 0 };
        });

        const list = await getWorktreeList('/test/repo', false);
        expect(list).toHaveLength(1);
        expect(list[0].lastCommitDate).toBeUndefined();

        const calledCommands = mockExec.mock.calls.map((call) => call[1]?.[0]);
        expect(calledCommands).not.toContain('log');
    });

    it('keeps dates for valid worktrees when one commit object is missing', async () => {
        const good = '1111111111111111111111111111111111111111';
        const missing = '2222222222222222222222222222222222222222';
        const bare = '3333333333333333333333333333333333333333';
        const prunable = '4444444444444444444444444444444444444444';
        const mockExec = rs.mocked(execBaseModule.execBase);
        mockExec.mockImplementation(async (_cwd: string, args?: string[]) => {
            const command = args?.[0];
            if (command === 'worktree') {
                return {
                    stdout: [
                        'worktree /test/repo',
                        `HEAD ${good}`,
                        'branch refs/heads/main',
                        '',
                        'worktree /test/repo/missing',
                        `HEAD ${missing}`,
                        'branch refs/heads/missing',
                        '',
                        'worktree /test/repo.git',
                        `HEAD ${bare}`,
                        'bare',
                        '',
                        'worktree /test/repo/gone',
                        `HEAD ${prunable}`,
                        'prunable gitdir file points to non-existent location',
                        '',
                    ].join('\n'),
                    stderr: '',
                    code: 0,
                };
            }
            if (command === 'rev-parse') {
                return { stdout: '/test/repo/.git\n', stderr: '', code: 0 };
            }
            if (command === 'for-each-ref') {
                return { stdout: 'main|origin/main|\nmissing|origin/missing|\n', stderr: '', code: 0 };
            }
            if (command === 'log') {
                const hashes = args?.slice(3) ?? [];
                expect(hashes).not.toContain(bare);
                expect(hashes).not.toContain(prunable);
                if (hashes.length > 1) throw new Error('bad object');
                if (hashes[0] === good) {
                    return { stdout: `${good} 2026-09-23T10:00:00+08:00\n`, stderr: '', code: 0 };
                }
                throw new Error('bad object');
            }
            return { stdout: '', stderr: '', code: 0 };
        });

        const list = await getWorktreeList('/test/repo');
        const byPath = Object.fromEntries(list.map((item) => [item.path, item]));
        expect(byPath['/test/repo'].lastCommitDate).toBe('2026-09-23T10:00:00+08:00');
        expect(byPath['/test/repo/missing'].lastCommitDate).toBeUndefined();
        expect(byPath['/test/repo.git'].lastCommitDate).toBeUndefined();
        expect(byPath['/test/repo/gone'].lastCommitDate).toBeUndefined();

        const logCalls = mockExec.mock.calls.filter((call) => call[1]?.[0] === 'log');
        expect(logCalls).toHaveLength(3);
        expect(logCalls[0][1]?.slice(3)?.sort()).toEqual([good, missing].sort());
    });
});
