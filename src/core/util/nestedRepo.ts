import { WorkspaceState } from '@/core/state';
import { toSimplePath } from '@/core/util/path';

const normalize = (list: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of list) {
        const normalized = toSimplePath(item);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
    }
    return result;
};

const distinct = (paths: string[]): string[] => [
    ...new Set(paths.map((item) => toSimplePath(item)).filter((item) => item)),
];

// Nested repositories in the current workspace that the user selected for display
export const getNestedRepos = (): string[] => normalize(WorkspaceState.get('workspaceNestedRepos', []));

export const updateNestedRepos = (paths: string[]): Thenable<void> => {
    return WorkspaceState.update('workspaceNestedRepos', distinct(paths));
};
