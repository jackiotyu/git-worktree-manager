import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import path from 'path';
import * as execModule from '@/core/git/exec';
import {
    getCommonMultiRepositoryBranches,
    switchMultiRepositoryWorktreeBranch,
    type MultiRepositoryWorktreeEntry,
} from '@/core/multiRepository/worktreeService';
import type { RepoEntry } from '@/types';

rs.mock('vscode', () => ({
    env: { language: 'en' },
    l10n: { t: (message: string) => message },
    window: {
        createOutputChannel: () => ({
            appendLine: () => {},
            append: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {},
            error: () => {},
            info: () => {},
            trace: () => {},
            warn: () => {},
        }),
    },
}));

rs.mock('@/core/git/exec', () => ({
    execAuto: rs.fn(),
}));

const result = (stdout = '') => ({ stdout, stderr: '', code: 0 });
const mainRepo = path.resolve('repos/main');
const mainWorktree = path.resolve('worktrees/feature');
const childRepo = {
    name: 'client',
    relativePath: 'client',
    sourcePath: path.resolve('repos/client'),
} as RepoEntry;
const entry: MultiRepositoryWorktreeEntry = {
    path: mainWorktree,
    branch: 'feature',
    isMain: false,
    isMultiRepository: true,
    repoStatuses: [true],
};

function worktreeList(source: string, target: string): string {
    return `worktree ${source}
branch refs/heads/main

worktree ${target}
branch refs/heads/feature

worktree ${target}-other
branch refs/heads/shared
`;
}

describe('multi-repository branch switching', () => {
    beforeEach(() => {
        rs.clearAllMocks();
    });

    it('lists only branches shared by every repository and not checked out elsewhere', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (cwd = '', args = []) => {
            if (args[0] === 'branch') return result('main\nfeature\nshared\n');
            if (args[0] === 'worktree') {
                return result(
                    cwd === mainRepo
                        ? worktreeList(mainRepo, mainWorktree)
                        : worktreeList(childRepo.sourcePath, path.join(mainWorktree, 'client')),
                );
            }
            return result();
        });

        const branches = await getCommonMultiRepositoryBranches(mainRepo, [childRepo], entry);

        expect(branches).toEqual(['feature']);
    });

    it('uses configured source paths for child repositories in the main worktree', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (cwd = '', args = []) => {
            if (args[0] === 'branch') return result('main\n');
            if (args[0] === 'worktree') return result(`worktree ${cwd}\nbranch refs/heads/main\n`);
            return result();
        });

        const mainEntry: MultiRepositoryWorktreeEntry = {
            ...entry,
            path: mainRepo,
            isMain: true,
        };

        await expect(getCommonMultiRepositoryBranches(mainRepo, [childRepo], mainEntry)).resolves.toEqual(['main']);

        expect(execModule.execAuto).toHaveBeenCalledWith(childRepo.sourcePath, ['branch', '--format=%(refname:short)']);
        expect(execModule.execAuto).not.toHaveBeenCalledWith(
            path.join(mainRepo, 'client'),
            ['branch', '--format=%(refname:short)'],
        );
    });

    it('creates a new branch from each repository worktree current HEAD', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (_cwd = '', args = []) => {
            if (args[0] === 'branch' && args[1] === '--show-current') {
                return result(_cwd === mainWorktree ? 'feature\n' : 'child-current\n');
            }
            if (args[0] === 'branch') return result('main\nfeature\n');
            return result();
        });

        await switchMultiRepositoryWorktreeBranch(mainRepo, [childRepo], entry, 'new-feature');

        expect(execModule.execAuto).toHaveBeenCalledWith(mainWorktree, ['switch', '-c', 'new-feature']);
        expect(execModule.execAuto).toHaveBeenCalledWith(path.join(mainWorktree, 'client'), [
            'switch',
            '-c',
            'new-feature',
        ]);
    });

    it('does not create a branch when a repository is in detached HEAD', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (cwd = '', args = []) => {
            if (args[0] === 'branch' && args[1] === '--show-current') {
                return result(cwd === mainWorktree ? 'feature\n' : '');
            }
            if (args[0] === 'branch') return result('main\nfeature\n');
            return result();
        });

        await expect(switchMultiRepositoryWorktreeBranch(mainRepo, [childRepo], entry, 'new-feature')).rejects.toThrow(
            'detached HEAD',
        );

        expect(execModule.execAuto).not.toHaveBeenCalledWith(mainWorktree, ['switch', '-c', 'new-feature']);
        expect(execModule.execAuto).not.toHaveBeenCalledWith(path.join(mainWorktree, 'client'), [
            'switch',
            '-c',
            'new-feature',
        ]);
    });

    it('does not change repositories when the target branch exists in only some repositories', async () => {
        rs.mocked(execModule.execAuto).mockImplementation(async (cwd = '', args = []) => {
            if (args[0] === 'branch') return result(cwd === mainWorktree ? 'partial\nmain\n' : 'main\n');
            return result();
        });

        await expect(switchMultiRepositoryWorktreeBranch(mainRepo, [childRepo], entry, 'partial')).rejects.toThrow(
            'No repositories were changed',
        );

        expect(execModule.execAuto).not.toHaveBeenCalledWith(mainWorktree, ['switch', 'partial']);
        expect(execModule.execAuto).not.toHaveBeenCalledWith(path.join(mainWorktree, 'client'), ['switch', 'partial']);
    });
});
