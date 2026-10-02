import fs from 'fs/promises';
import { join } from 'path';
import type { IWorktreeDetail, WorktreeSortOrder } from '@/types';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const compareByName = (a: IWorktreeDetail, b: IWorktreeDetail): number =>
    collator.compare(a.name, b.name) || compareText(a.name, b.name) || compareText(a.path, b.path);

/**
 * Creation time is approximated by the filesystem birthtime of the worktree's `.git` entry
 * (directory for the main worktree, gitfile for linked ones; the repo dir itself for bare).
 * It reflects when this copy was created on disk, so a copied/restored/re-cloned worktree gets a new time.
 * Unavailable or invalid birthtimes are treated as unknown.
 */
const getCreatedTime = async (worktree: IWorktreeDetail): Promise<number | undefined> => {
    const target = worktree.isBare ? worktree.path : join(worktree.path, '.git');
    try {
        const { birthtimeMs } = await fs.stat(target);
        return Number.isFinite(birthtimeMs) && birthtimeMs > 0 ? birthtimeMs : undefined;
    } catch {
        return undefined;
    }
};

export async function sortWorktrees<T extends IWorktreeDetail>(
    worktrees: readonly T[],
    order: WorktreeSortOrder,
): Promise<T[]> {
    if (order === 'nameAsc') return [...worktrees].sort(compareByName);
    if (order === 'nameDesc') return [...worktrees].sort((a, b) => compareByName(b, a));

    const entries = await Promise.all(
        worktrees.map(async (worktree) => ({ worktree, time: await getCreatedTime(worktree) })),
    );
    const direction = order === 'createdDesc' ? -1 : 1;
    return entries
        .sort((a, b) => {
            if (a.time === undefined || b.time === undefined) {
                if (a.time === b.time) return compareByName(a.worktree, b.worktree);
                return a.time === undefined ? 1 : -1;
            }
            return direction * (a.time - b.time) || compareByName(a.worktree, b.worktree);
        })
        .map((entry) => entry.worktree);
}
