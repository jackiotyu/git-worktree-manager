import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import path from 'path';
import { scanNestedRepos } from '../../core/util/repoScan';
import { toSimplePath } from '../../core/util/path';
import folderRoot from '../../core/folderRoot';
import * as topLevelModule from '../../core/git/getWorktreeTopLevel';
import * as execBaseModule from '../../core/git/exec-base';

const root = 'wsroot';
const repoA = path.join(root, 'A');
const repoB = path.join(root, 'sub', 'B');
const worktreeDir = path.join(root, 'wt');
const rootRepoInner = path.join(root, 'rootinner');
const innerOfA = path.join(repoA, 'inner');
const repoC = path.join(repoA, 'C');
const skippedRepo = path.join(root, 'node_modules', 'C');
const bareRepo = path.join(root, 'bare.git');
const fakeHeadDir = path.join(root, 'fake-head');

// Directories containing a .git entry: root itself is a repo (should be skipped); repoA embeds repoC; skippedRepo under node_modules should be ignored
const gitDirs = [root, repoA, repoC, innerOfA, repoB, worktreeDir, rootRepoInner, skippedRepo];

// Top-level worktree of each directory: a linked worktree returns itself, a subdirectory inside a repo returns the repo root
const topLevels = new Map<string, string>([
    [root, root],
    [repoA, repoA],
    [repoC, repoC],
    [innerOfA, repoA],
    [repoB, repoB],
    [worktreeDir, worktreeDir],
    [rootRepoInner, rootRepoInner],
    [skippedRepo, skippedRepo],
]);

let capturedOptions: Record<string, unknown> | undefined;

rs.mock('fast-glob', () => ({
    stream: rs.fn((patterns: string[], options: Record<string, unknown>) => {
        capturedOptions = options;
        return (async function* () {
            if (patterns.includes('**/.git')) {
                for (const dir of gitDirs) {
                    const entry = path.join(dir, '.git');
                    // Simulate fast-glob's ignore semantics (node_modules produces no output)
                    if (entry.split(/[\\\\/]/).includes('node_modules')) continue;
                    yield entry;
                }
            }
            if (patterns.includes('**/HEAD')) {
                yield path.join(bareRepo, 'HEAD');
                yield path.join(fakeHeadDir, 'HEAD');
            }
        })();
    }),
}));

rs.mock('fs/promises', () => ({
    stat: rs.fn(async (filePath: string) => {
        if (filePath === path.join(bareRepo, 'config')) return { isFile: () => true };
        if (filePath === path.join(bareRepo, 'objects')) return { isDirectory: () => true };
        throw new Error('not found');
    }),
}));

rs.mock('@/core/config/setting', () => ({
    Config: { get: rs.fn(() => ['**/generated/**']) },
}));

rs.mock('../../core/folderRoot', () => ({
    default: { folderPathSet: new Set<string>() },
}));

rs.mock('../../core/git/getWorktreeTopLevel', () => ({
    getWorktreeTopLevel: rs.fn(),
}));

rs.mock('../../core/git/exec-base', () => ({
    execBase: rs.fn(async (cwd: string) => ({ stdout: cwd === bareRepo ? 'true\n' : 'false\n' })),
}));

rs.mock('../../core/util/path', () => ({
    toSimplePath: (input: string = '') => input.replace(/\\\\/g, '/').trim(),
    comparePath: (a: string, b: string) => a.replace(/\\\\/g, '/').trim() === b.replace(/\\\\/g, '/').trim(),
}));

describe('scanNestedRepos', () => {
    beforeEach(() => {
        rs.clearAllMocks();
        capturedOptions = undefined;
        (folderRoot as any).folderPathSet = new Set([root]);
        rs.mocked(topLevelModule.getWorktreeTopLevel).mockImplementation(async (dir: string) => {
            return topLevels.get(dir) || '';
        });
    });

    it('finds repository roots and linked worktrees, skipping the workspace root and node_modules', async () => {
        const found = await scanNestedRepos();

        expect(new Set(found)).toEqual(
            new Set([repoA, repoC, repoB, worktreeDir, rootRepoInner, bareRepo].map((item) => toSimplePath(item))),
        );
        expect(found).not.toContain(toSimplePath(root));
        expect(found).not.toContain(toSimplePath(skippedRepo));
    });

    it('discovers bare repositories and ignores unrelated HEAD files', async () => {
        const found = await scanNestedRepos();

        expect(found).toContain(toSimplePath(bareRepo));
        expect(found).not.toContain(toSimplePath(fakeHeadDir));
        expect(execBaseModule.execBase).toHaveBeenCalledWith(bareRepo, ['rev-parse', '--is-bare-repository']);
    });

    it('asks fast-glob to ignore node_modules and .git contents', async () => {
        await scanNestedRepos();

        expect(capturedOptions).toMatchObject({
            cwd: root,
            absolute: true,
            dot: true,
            onlyFiles: false,
            followSymbolicLinks: false,
        });
        expect(capturedOptions?.ignore).toEqual(expect.arrayContaining(['**/node_modules/**', '**/.git/**', '**/generated/**']));
    });
});
