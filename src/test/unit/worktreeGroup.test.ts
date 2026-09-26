import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import type * as vscode from 'vscode';
import { GlobalState } from '../../core/state';
import {
    assignWorktreeToGroup,
    createWorktreeGroup,
    deleteWorktreeGroup,
    getRepositoryWorktreeGroups,
    removeWorktreeGroupAssignment,
    renameWorktreeGroup,
    replaceGroupedWorktreePath,
} from '../../core/util/worktreeGroup';

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    EventEmitter: class {
        event = () => ({ dispose: () => {} });
        fire() {}
        dispose() {}
    },
}));
/* eslint-enable @typescript-eslint/naming-convention */

describe('worktree groups', () => {
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = {};
        GlobalState.state = {
            get: <T>(key: string, defaultValue?: T) => (state[key] as T | undefined) ?? defaultValue,
            update: (key: string, value: unknown) => {
                state[key] = value;
                return Promise.resolve();
            },
            keys: () => Object.keys(state),
        } as vscode.Memento;
    });

    it('creates repository-scoped groups and rejects duplicate names', async () => {
        const first = await createWorktreeGroup('/repo/one', ' Shopify OAuth ');
        const duplicate = await createWorktreeGroup('/repo/one', 'shopify oauth');
        const otherRepository = await createWorktreeGroup('/repo/two', 'Shopify OAuth');

        expect(first?.name).toBe('Shopify OAuth');
        expect(duplicate).toBeUndefined();
        expect(otherRepository).toBeDefined();
        expect(getRepositoryWorktreeGroups('/repo/one')).toHaveLength(1);
        expect(getRepositoryWorktreeGroups('/repo/two')).toHaveLength(1);
    });

    it('assigns a worktree to only one group within its repository', async () => {
        const first = await createWorktreeGroup('/repo', 'First');
        const second = await createWorktreeGroup('/repo', 'Second');
        const unrelated = await createWorktreeGroup('/other', 'Other');
        expect(first && second && unrelated).toBeTruthy();

        await assignWorktreeToGroup('/other', '/repo.worktrees/feature', unrelated!.id);
        await assignWorktreeToGroup('/repo', '/repo.worktrees/feature', first!.id);
        await assignWorktreeToGroup('/repo', '/repo.worktrees/feature', second!.id);

        const groups = getRepositoryWorktreeGroups('/repo');
        expect(groups.find((group) => group.id === first!.id)?.worktreePaths).toEqual([]);
        expect(groups.find((group) => group.id === second!.id)?.worktreePaths).toEqual(['/repo.worktrees/feature']);
        expect(getRepositoryWorktreeGroups('/other')[0].worktreePaths).toEqual(['/repo.worktrees/feature']);
    });

    it('renames and deletes groups without affecting other groups', async () => {
        const first = await createWorktreeGroup('/repo', 'First');
        await createWorktreeGroup('/repo', 'Second');

        expect(await renameWorktreeGroup(first!.id, 'Renamed')).toBe(true);
        expect(await renameWorktreeGroup(first!.id, 'second')).toBe(false);
        await deleteWorktreeGroup(first!.id);

        expect(getRepositoryWorktreeGroups('/repo').map((group) => group.name)).toEqual(['Second']);
    });

    it('updates and removes assignments when worktrees move or are deleted', async () => {
        const group = await createWorktreeGroup('/repo', 'Group');
        await assignWorktreeToGroup('/repo', '/repo.worktrees/old/', group!.id);
        await replaceGroupedWorktreePath('/repo.worktrees/old', '/repo.worktrees/new');

        expect(getRepositoryWorktreeGroups('/repo')[0].worktreePaths).toEqual(['/repo.worktrees/new']);

        await removeWorktreeGroupAssignment('/repo.worktrees/new');
        expect(getRepositoryWorktreeGroups('/repo')[0].worktreePaths).toEqual([]);
    });

    it('ungroups without deleting the group', async () => {
        const group = await createWorktreeGroup('/repo', 'Group');
        await assignWorktreeToGroup('/repo', '/repo.worktrees/feature', group!.id);
        await assignWorktreeToGroup('/repo', '/repo.worktrees/feature');

        expect(getRepositoryWorktreeGroups('/repo')[0].worktreePaths).toEqual([]);
    });
});
