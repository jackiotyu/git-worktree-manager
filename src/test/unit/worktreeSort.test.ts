import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import fs from 'fs/promises';
import { join } from 'path';
import { sortWorktrees } from '../../core/util/worktreeSort';
import type { IWorktreeDetail } from '../../types';

rs.mock('fs/promises', () => {
    const stat = rs.fn();
    return { default: { stat }, stat };
});

const mockStat = rs.mocked(fs.stat);

const makeWorktree = (name: string, path = `/repo/${name}`, extra: Partial<IWorktreeDetail> = {}): IWorktreeDetail => ({
    name,
    path,
    hash: 'abc123',
    detached: false,
    prunable: false,
    isBare: false,
    isBranch: true,
    isTag: false,
    locked: false,
    isMain: false,
    mainFolder: '/repo/main',
    ...extra,
});

const gitEntry = (path: string) => join(path, '.git');
const names = (list: IWorktreeDetail[]) => list.map((w) => w.name);

// Maps worktree .git entries (or bare dirs) to birthtimes; missing keys reject like a missing file.
const setBirthtimes = (times: Record<string, number>) => {
    mockStat.mockImplementation((async (target: string) => {
        if (!(target in times)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        return { birthtimeMs: times[target] };
    }) as unknown as typeof fs.stat);
};

describe('sortWorktrees', () => {
    beforeEach(() => {
        rs.clearAllMocks();
        mockStat.mockReset();
    });

    describe('default mode', () => {
        it('returns a copy preserving the exact input order without touching the filesystem', async () => {
            const list = [
                makeWorktree('zeta', '/repo/z', { isMain: true }),
                makeWorktree('Alpha', '/repo/a'),
                makeWorktree('beta-10', '/repo/b10'),
                makeWorktree('beta-2', '/repo/b2'),
            ];
            const snapshot = [...list];

            const result = await sortWorktrees(list, 'default');

            expect(result).not.toBe(list);
            expect(result).toEqual(snapshot);
            result.forEach((item, index) => expect(item).toBe(snapshot[index]));
            expect(list).toEqual(snapshot);
            expect(mockStat).not.toHaveBeenCalled();
        });
    });

    describe('name modes', () => {
        it('sorts nameAsc naturally and case-insensitively', async () => {
            const list = ['feature-10', 'Feature-2', 'bugfix', 'feature-1', 'Alpha'].map((n) => makeWorktree(n));
            const result = await sortWorktrees(list, 'nameAsc');
            expect(names(result)).toEqual(['Alpha', 'bugfix', 'feature-1', 'Feature-2', 'feature-10']);
        });

        it('sorts nameDesc as the exact reverse of nameAsc', async () => {
            const list = ['feature-10', 'Feature-2', 'bugfix', 'feature-1', 'Alpha'].map((n) => makeWorktree(n));
            const result = await sortWorktrees(list, 'nameDesc');
            expect(names(result)).toEqual(['feature-10', 'Feature-2', 'feature-1', 'bugfix', 'Alpha']);
        });

        it('sorts by name regardless of branch/tag/hash kind', async () => {
            const list = [
                makeWorktree('v2.0', '/repo/a', { isBranch: false, isTag: true }),
                makeWorktree('abc1234', '/repo/b', { isBranch: false, detached: true }),
                makeWorktree('main', '/repo/c', { isMain: true }),
            ];
            expect(names(await sortWorktrees(list, 'nameAsc'))).toEqual(['abc1234', 'main', 'v2.0']);
        });

        it('keeps same-name worktrees stable by exact name then path regardless of input order', async () => {
            const a = makeWorktree('dev', '/repo/a');
            const b = makeWorktree('dev', '/repo/b');
            const lower = makeWorktree('DEV', '/repo/c');

            const forward = await sortWorktrees([b, lower, a], 'nameAsc');
            const backward = await sortWorktrees([a, lower, b], 'nameAsc');
            expect(forward.map((w) => w.path)).toEqual(backward.map((w) => w.path));
            // Case-insensitive equal: exact-name tiebreak puts 'DEV' before 'dev', then path ascending
            expect(forward.map((w) => w.path)).toEqual(['/repo/c', '/repo/a', '/repo/b']);

            const desc = await sortWorktrees([a, b, lower], 'nameDesc');
            expect(desc.map((w) => w.path)).toEqual(['/repo/b', '/repo/a', '/repo/c']);
        });

        it('does not touch the filesystem', async () => {
            const list = [makeWorktree('b'), makeWorktree('a')];
            await sortWorktrees(list, 'nameAsc');
            await sortWorktrees(list, 'nameDesc');
            expect(mockStat).not.toHaveBeenCalled();
        });
    });

    describe('created modes', () => {
        const a = makeWorktree('a', '/repo/a');
        const b = makeWorktree('b', '/repo/b');
        const c = makeWorktree('c', '/repo/c');

        it('sorts createdDesc newest first and createdAsc oldest first', async () => {
            setBirthtimes({
                [gitEntry(a.path)]: 2000,
                [gitEntry(b.path)]: 3000,
                [gitEntry(c.path)]: 1000,
            });
            expect(names(await sortWorktrees([a, b, c], 'createdDesc'))).toEqual(['b', 'a', 'c']);
            expect(names(await sortWorktrees([a, b, c], 'createdAsc'))).toEqual(['c', 'a', 'b']);
        });

        it('places unknown creation times last in both directions', async () => {
            setBirthtimes({
                [gitEntry(a.path)]: 2000,
                [gitEntry(c.path)]: 1000,
                // b is missing -> stat rejects
            });
            expect(names(await sortWorktrees([b, a, c], 'createdDesc'))).toEqual(['a', 'c', 'b']);
            expect(names(await sortWorktrees([b, a, c], 'createdAsc'))).toEqual(['c', 'a', 'b']);
        });

        it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('treats birthtime %s as unknown', async (bad) => {
            setBirthtimes({
                [gitEntry(a.path)]: bad,
                [gitEntry(b.path)]: 500,
                [gitEntry(c.path)]: 100,
            });
            expect(names(await sortWorktrees([a, b, c], 'createdDesc'))).toEqual(['b', 'c', 'a']);
            expect(names(await sortWorktrees([a, b, c], 'createdAsc'))).toEqual(['c', 'b', 'a']);
        });

        it('orders multiple unknown entries by name then path in both directions', async () => {
            const x2 = makeWorktree('x', '/repo/x2');
            const x1 = makeWorktree('x', '/repo/x1');
            const known = makeWorktree('known', '/repo/known');
            setBirthtimes({ [gitEntry(known.path)]: 10 });
            for (const order of ['createdDesc', 'createdAsc'] as const) {
                const result = await sortWorktrees([x2, c, known, x1], order);
                expect(result.map((w) => w.path)).toEqual(['/repo/known', '/repo/c', '/repo/x1', '/repo/x2']);
            }
        });

        it('breaks equal creation times by name ascending in both directions, then path', async () => {
            const b2 = makeWorktree('b', '/repo/b2');
            setBirthtimes({
                [gitEntry(a.path)]: 1000,
                [gitEntry(b.path)]: 1000,
                [gitEntry(b2.path)]: 1000,
                [gitEntry(c.path)]: 1000,
            });
            const expected = ['/repo/a', '/repo/b', '/repo/b2', '/repo/c'];
            expect((await sortWorktrees([c, b2, b, a], 'createdDesc')).map((w) => w.path)).toEqual(expected);
            expect((await sortWorktrees([c, b2, b, a], 'createdAsc')).map((w) => w.path)).toEqual(expected);
        });

        it('stats the .git entry for main and linked worktrees, and the repo dir for bare', async () => {
            const main = makeWorktree('main', '/repo/main', { isMain: true });
            const linked = makeWorktree('linked', '/repo/linked');
            const bare = makeWorktree('bare', '/repo/bare.git', { isBare: true, isMain: true });
            setBirthtimes({
                [join('/repo/main', '.git')]: 1,
                [join('/repo/linked', '.git')]: 2,
                [bare.path]: 3,
            });

            const result = await sortWorktrees([main, linked, bare], 'createdAsc');
            expect(names(result)).toEqual(['main', 'linked', 'bare']);

            const statted = mockStat.mock.calls.map((call) => call[0]).sort();
            const expected = [join('/repo/linked', '.git'), join('/repo/main', '.git'), '/repo/bare.git'];
            expect(statted).toEqual(expected.sort());
        });

        it('stats every worktree concurrently before any stat resolves', async () => {
            const resolvers: Array<() => void> = [];
            mockStat.mockImplementation(
                (() =>
                    new Promise((resolve) => {
                        resolvers.push(() => resolve({ birthtimeMs: 1000 }));
                    })) as unknown as typeof fs.stat,
            );

            const pending = sortWorktrees([a, b, c], 'createdDesc');
            await Promise.resolve();
            expect(mockStat).toHaveBeenCalledTimes(3);
            resolvers.forEach((resolve) => resolve());
            expect(names(await pending)).toEqual(['a', 'b', 'c']);
        });

        it('treats stat errors of any kind as unknown without rejecting', async () => {
            mockStat.mockImplementation((async (target: string) => {
                if (target === gitEntry(a.path)) throw new Error('EACCES');
                if (target === gitEntry(b.path)) throw new Error('ENOENT');
                return { birthtimeMs: 42 };
            }) as unknown as typeof fs.stat);
            const result = await sortWorktrees([a, b, c], 'createdDesc');
            expect(names(result)).toEqual(['c', 'a', 'b']);
        });
    });

    describe('input handling', () => {
        it('returns a new array and never mutates the input in any mode', async () => {
            const list = [makeWorktree('b'), makeWorktree('c'), makeWorktree('a')];
            const frozen = Object.freeze([...list]);
            setBirthtimes({
                [gitEntry('/repo/a')]: 1,
                [gitEntry('/repo/b')]: 2,
                [gitEntry('/repo/c')]: 3,
            });
            for (const order of ['default', 'nameAsc', 'nameDesc', 'createdDesc', 'createdAsc'] as const) {
                const result = await sortWorktrees(frozen, order);
                expect(result).not.toBe(frozen);
                expect(result).toHaveLength(3);
            }
            expect(frozen).toEqual(list);
            expect(names([...frozen])).toEqual(['b', 'c', 'a']);
        });

        it('returns the same worktree objects and handles empty input', async () => {
            const only = makeWorktree('only');
            setBirthtimes({ [gitEntry(only.path)]: 1 });
            expect((await sortWorktrees([only], 'createdAsc'))[0]).toBe(only);
            expect(await sortWorktrees([], 'createdDesc')).toEqual([]);
            expect(await sortWorktrees([], 'nameAsc')).toEqual([]);
        });

        it('does not cache creation times between calls', async () => {
            const a = makeWorktree('a', '/repo/a');
            const b = makeWorktree('b', '/repo/b');
            setBirthtimes({ [gitEntry(a.path)]: 1, [gitEntry(b.path)]: 2 });
            expect(names(await sortWorktrees([a, b], 'createdDesc'))).toEqual(['b', 'a']);
            setBirthtimes({ [gitEntry(a.path)]: 3, [gitEntry(b.path)]: 2 });
            expect(names(await sortWorktrees([a, b], 'createdDesc'))).toEqual(['a', 'b']);
            expect(mockStat).toHaveBeenCalledTimes(4);
        });
    });
});
