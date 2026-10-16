import path from 'path';
import { execAuto } from '@/core/git/exec';

/**
 * Resolve the worktree root used as the coordinator for multi-repository worktrees.
 * A non-bare repository has a shared common directory named ".git", whose parent
 * is the main worktree. With a bare repository, use the current worktree instead.
 */
export async function getMainWorktreeRoot(cwd: string): Promise<string> {
    try {
        const { stdout } = await execAuto(cwd, ['rev-parse', '--git-common-dir']);
        const commonDir = stdout.trim();
        if (!commonDir) return '';

        const resolvedCommonDir = path.resolve(cwd, commonDir);
        return path.basename(resolvedCommonDir) === '.git' ? path.dirname(resolvedCommonDir) : cwd;
    } catch {
        return '';
    }
}
