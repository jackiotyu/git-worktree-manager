import path from 'path';
import folderRoot from '@/core/folderRoot';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';
import { comparePath, toSimplePath } from '@/core/util/path';

const GIT_ENTRY_GLOB = '**/.git';
// Note: do not use '**/.git/**' - micromatch would also match the .git entry itself, swallowing all results.
// '**/.git/*' matches only children of .git, pruning the traversal while still matching the .git entry.
const IGNORE_GLOBS = ['**/node_modules/**', '**/.git/*'];

// A directory containing a .git entry is a candidate (a directory for the main repo, a file for linked worktrees); the worktree top-level check filters out fake .git entries
const isRepoRoot = async (dir: string): Promise<boolean> => {
    const topLevel = await getWorktreeTopLevel(dir);
    return Boolean(topLevel) && comparePath(topLevel, dir);
};

export const scanNestedRepos = async (): Promise<string[]> => {
    const { stream: fgStream } = await import('fast-glob');
    const rootPaths = new Set([...folderRoot.folderPathSet].map((item) => toSimplePath(item)));
    const found: string[] = [];
    const seen = new Set<string>();

    for (const root of folderRoot.folderPathSet) {
        const stream = fgStream(GIT_ENTRY_GLOB, {
            cwd: root,
            absolute: true,
            dot: true,
            onlyFiles: false,
            followSymbolicLinks: false,
            suppressErrors: true,
            ignore: IGNORE_GLOBS,
        });

        for await (const entry of stream) {
            const dir = path.dirname(entry.toString());
            const normalized = toSimplePath(dir);
            // The workspace root itself is not treated as a nested repository
            if (rootPaths.has(normalized) || seen.has(normalized)) continue;
            seen.add(normalized);
            if (await isRepoRoot(dir)) found.push(normalized);
        }
    }

    return found;
};
