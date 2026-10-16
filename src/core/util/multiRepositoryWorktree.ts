import fs from 'fs/promises';
import path from 'path';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';

export async function pathExists(target: string): Promise<boolean> {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

export function resolveRepoPath(root: string, relativePath: string): string {
    const segments = relativePath.split(/[\\/]/);
    if (
        !relativePath ||
        path.isAbsolute(relativePath) ||
        path.win32.isAbsolute(relativePath) ||
        path.win32.parse(relativePath).root ||
        segments.includes('..')
    ) {
        throw new Error(`Repository path must be a safe relative path: ${relativePath}`);
    }
    const resolved = path.resolve(root, relativePath);
    const relative = path.relative(root, resolved);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Repository path escapes the workspace root: ${relativePath}`);
    }
    return resolved;
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
    const repoRoot = await getWorktreeTopLevel(repoPath);
    if (!repoRoot) return false;
    const target = path.resolve(repoPath);
    const resolvedRoot = path.resolve(repoRoot);
    return process.platform === 'win32'
        ? resolvedRoot.toLowerCase() === target.toLowerCase()
        : resolvedRoot === target;
}

export async function isGitRepositoryPresent(repoPath: string): Promise<boolean> {
    try {
        const [repoStat, gitStat] = await Promise.all([fs.stat(repoPath), fs.stat(path.join(repoPath, '.git'))]);
        return repoStat.isDirectory() && (gitStat.isFile() || gitStat.isDirectory());
    } catch {
        return false;
    }
}
