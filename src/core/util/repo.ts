import fs from 'fs/promises';
import path from 'path';
import { getWorktreeTopLevel } from '@/core/git/getWorktreeTopLevel';
import { toSimplePath } from '@/core/util/path';

export async function hasGitMetadata(dir: string): Promise<boolean> {
    const gitEntry = path.join(dir, '.git');
    try {
        const entry = await fs.stat(gitEntry);
        if (entry.isDirectory()) {
            const head = await fs.stat(path.join(gitEntry, 'HEAD'));
            return head.isFile();
        }
        if (!entry.isFile()) return false;

        const content = await fs.readFile(gitEntry, 'utf8');
        const match = /^gitdir:\s*(.+)\s*$/im.exec(content);
        if (!match) return false;

        const gitDir = path.resolve(dir, match[1].trim());
        const [target, head] = await Promise.all([fs.stat(gitDir), fs.stat(path.join(gitDir, 'HEAD'))]);
        return target.isDirectory() && head.isFile();
    } catch {
        return false;
    }
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
    const repoRoot = await getWorktreeTopLevel(repoPath);
    if (!repoRoot) return false;
    return toSimplePath(repoRoot) === toSimplePath(repoPath);
}

