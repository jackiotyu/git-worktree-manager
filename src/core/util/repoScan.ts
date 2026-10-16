import fs from 'fs/promises';
import path from 'path';
import folderRoot from '@/core/folderRoot';
import { Config } from '@/core/config/setting';
import { execBase } from '@/core/git/exec-base';
import { toSimplePath } from '@/core/util/path';
import { hasGitMetadata } from '@/core/util/repo';

const GIT_ENTRY_GLOB = ['**/.git', '**/HEAD'];
const DEFAULT_IGNORE_GLOBS = ['**/node_modules/**', '**/.git/*'];

// A bare repository has a config file and object database at its root. Git verifies candidates to avoid false positives.
const hasBareRepoLayout = async (dir: string): Promise<boolean> => {
    try {
        const [config, objects] = await Promise.all([
            fs.stat(path.join(dir, 'config')),
            fs.stat(path.join(dir, 'objects')),
        ]);
        return config.isFile() && objects.isDirectory();
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

// Bound Git subprocess concurrency so large workspaces do not spawn one process per candidate at once.
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
    const ignoreGlobs = [
        ...new Set([...DEFAULT_IGNORE_GLOBS, ...Config.get('nestedRepoScanIgnores', []).filter(Boolean)]),
    ];

    for (const root of roots) {
        const stream = fgStream(GIT_ENTRY_GLOB, {
            cwd: root,
            absolute: true,
            dot: true,
            onlyFiles: false,
            followSymbolicLinks: false,
            suppressErrors: true,
            ignore: ignoreGlobs,
        });

        for await (const entry of stream) {
            const entryPath = entry.toString();
            const bare = path.basename(entryPath) === 'HEAD';
            const dir = path.dirname(entryPath);
            const normalized = toSimplePath(dir);
            if (rootPaths.has(normalized)) continue;

            const existing = candidates.get(normalized);
            // Prefer a .git entry over a HEAD file if both patterns identify the same directory.
            if (!existing || (existing.bare && !bare)) {
                candidates.set(normalized, { path: dir, bare });
            }
        }
    }

    const candidateList = [...candidates.values()];
    const valid = await mapConcurrent(candidateList, 8, async (candidate) => {
        const isValid = candidate.bare
            ? await isBareRepository(candidate.path)
            : await hasGitMetadata(candidate.path);
        return isValid ? toSimplePath(candidate.path) : '';
    });

    return [...new Set(valid.filter(Boolean))];
};
