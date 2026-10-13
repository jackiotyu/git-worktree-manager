import path from 'path';
import { execBase } from '@/core/git/exec-base';
import { toSimplePath } from '@/core/util/path';

// Return the top-level directory of the worktree that contains cwd. Both the main repository and linked worktrees return their own directory; an ordinary subdirectory inside a repository returns the repository root.
export const getWorktreeTopLevel = async (cwd: string): Promise<string> => {
    try {
        const { stdout } = await execBase(cwd, ['rev-parse', '--show-toplevel']);
        const trimmed = stdout.trim();
        if (!trimmed) return '';
        return toSimplePath(path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed));
    } catch {
        return '';
    }
};
