import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { getNestedRepos, updateNestedRepos } from '../../core/util/nestedRepo';
import { WorkspaceState } from '../../core/state';

let store: Record<string, string[]> = {};

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('../../core/state', () => ({
    WorkspaceState: {
        get: (key: string, defaultValue: string[]) => store[key] ?? defaultValue,
        update: rs.fn(async (key: string, value: string[]) => {
            store[key] = value;
        }),
    },
}));
/* eslint-enable @typescript-eslint/naming-convention */

describe('nested repositories state', () => {
    beforeEach(() => {
        rs.clearAllMocks();
        store = {};
    });

    it('normalizes and de-duplicates stored paths on read', () => {
        store = { workspaceNestedRepos: ['a/b/', 'a/b', '  a/c  '] };

        expect(getNestedRepos()).toEqual(['a/b', 'a/c']);
    });

    it('normalizes and de-duplicates paths on write', async () => {
        await updateNestedRepos(['x/', 'x', 'y']);

        expect(WorkspaceState.update as any).toHaveBeenCalledWith('workspaceNestedRepos', ['x', 'y']);
        expect(getNestedRepos()).toEqual(['x', 'y']);
    });

    it('drops empty paths', async () => {
        await updateNestedRepos(['', '   ', 'a/b']);

        expect(getNestedRepos()).toEqual(['a/b']);
    });
});
