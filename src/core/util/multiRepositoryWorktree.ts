import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';

const markerFileName = 'git-worktree-manager-multi-repository.json';

export function normalizeWorktreePath(targetPath: string): string {
    const normalized = path.normalize(path.resolve(targetPath));
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export async function getRegisteredWorktreePaths(repoPath: string): Promise<Set<string>> {
    const { stdout } = await execAuto(repoPath, ['worktree', 'list', '--porcelain']);
    const paths = [...stdout.matchAll(/^worktree (.+)$/gm)].map((match) =>
        normalizeWorktreePath(match[1].trimEnd()),
    );
    return new Set(paths);
}

export async function isRegisteredWorktree(repoPath: string, targetPath: string): Promise<boolean> {
    const paths = await getRegisteredWorktreePaths(repoPath);
    return paths.has(normalizeWorktreePath(targetPath));
}

async function getMarkerPath(worktreePath: string): Promise<string> {
    const { stdout } = await execAuto(worktreePath, ['rev-parse', '--absolute-git-dir']);
    const gitDir = stdout.trim();
    if (!path.isAbsolute(gitDir)) {
        throw new Error(`Git returned a non-absolute git directory for worktree: ${worktreePath}`);
    }
    return path.join(gitDir, markerFileName);
}

export async function markMultiRepositoryWorktree(worktreePath: string): Promise<void> {
    const markerPath = await getMarkerPath(worktreePath);
    await fs.writeFile(markerPath, JSON.stringify({ version: 1 }) + '\n', 'utf8');
}

export async function isMarkedMultiRepositoryWorktree(worktreePath: string): Promise<boolean> {
    try {
        const markerPath = await getMarkerPath(worktreePath);
        const stat = await fs.stat(markerPath);
        return stat.isFile();
    } catch {
        return false;
    }
}
