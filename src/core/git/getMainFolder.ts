import path from 'path';
import { execBase } from '@/core/git/exec-base';
import { comparePath, toSimplePath } from '@/core/util/path';

const mainFolderCache = new Map<string, string>();

export const getMainFolder = async (cwd: string) => {
    const normalizedCwd = toSimplePath(cwd);
    const cached = mainFolderCache.get(normalizedCwd);
    if (cached !== undefined) return cached;

    try {
        const { stdout: mainFolderFull } = await execBase(cwd, ['rev-parse', '--git-common-dir']);
        const trimmed = mainFolderFull.trim();
        if (!trimmed) {
            return '';
        }
        const absPath = toSimplePath(path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed));
        const result = path.basename(absPath) === '.git' ? path.dirname(absPath) : absPath;
        mainFolderCache.set(normalizedCwd, result);
        return result;
    } catch {
        return '';
    }
};

export const clearMainFolderCache = (targetPath?: string) => {
    if (targetPath) {
        const normalized = toSimplePath(targetPath);
        for (const [key, value] of mainFolderCache.entries()) {
            if (comparePath(key, normalized) || comparePath(value, normalized)) {
                mainFolderCache.delete(key);
            }
        }
    } else {
        mainFolderCache.clear();
    }
};
