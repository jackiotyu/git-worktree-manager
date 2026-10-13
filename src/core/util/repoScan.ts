import fs from 'fs/promises';
import path from 'path';
import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';
import { comparePath, toSimplePath } from '@/core/util/path';

const GIT_ENTRY_GLOB = ['**/.git', '**/HEAD'];
// Ignore Git metadata contents while still matching the .git entry itself.
const IGNORE_GLOBS = ['**/node_modules/**', '**/.git/*'];

// Avoid starting Git for arbitrary files named HEAD: bare repositories have this layout.
const hasBareRepoLayout = async (dir: string): Promise<boolean> => {
    try {
        const [config, objects, refs] = await Promise.all([
            fs.stat(path.join(dir, 'config')),
            fs.stat(path.join(dir, 'objects')),
            fs.stat(path.join(dir, 'refs')),
        ]);
        return config.isFile() && objects.isDirectory() && refs.isDirectory();
    } catch {
        return false;
    }
};

const isBareRepository = async (dir: string): Promise<boolean> => {
    if (!(await hasBareRepoLayout(dir))) return false;
    try {
        const { stdout } = await execBase(dir, ['rev-parse', '--is-bare-repository']);
        return stdout.trim() === 'true';
    } catch {
        return false;
    }
};

const isRepoRoot = async (dir: string): Promise<boolean> => {
    const topLevel = await getWorktreeTopLevel(dir);
    return Boolean(topLevel) && comparePath(topLevel, dir);
};

// Run a bounded number of Git validations at once instead of serially spawning a process per candidate.
const mapConcurrent = async <T, R>(
    items: T[],
    concurrency: number,
    callback: (item: T) => Promise<R>,
): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const index = nextIndex++;
            if (index >= items.length) return;
            results[index] = await callback(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
};

export const scanNestedRepos = async (): Promise<string[]> => {
    const { stream: fgStream } = await import('fast-glob');
    const roots = [...folderRoot.folderPathSet];
    const rootPaths = new Set(roots.map((item) => toSimplePath(item)));
    const candidates = new Map<string, { path: string; bare: boolean }>();

    for (const root of roots) {
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
            const entryPath = entry.toString();
            const isBareCandidate = path.basename(entryPath) === 'HEAD';
            const dir = isBareCandidate ? path.dirname(entryPath) : path.dirname(entryPath);
            const normalized = toSimplePath(dir);
            // Do not include workspace roots or scan the same repository twice across workspace folders.
            if (rootPaths.has(normalized)) continue;
            const existing = candidates.get(normalized);
            if (!existing || (existing.bare && !isBareCandidate)) {
                candidates.set(normalized, { path: dir, bare: isBareCandidate });
            }
        }
    }

    const candidateList = [...candidates.values()];
    const valid = await mapConcurrent(candidateList, 8, async (candidate) => {
        const isValid = candidate.bare
            ? await isBareRepository(candidate.path)
            : await isRepoRoot(candidate.path);
        return isValid ? toSimplePath(candidate.path) : '';
    });

    return [...new Set(valid.filter(Boolean))];
};
