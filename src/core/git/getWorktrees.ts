import { execAuto } from '@/core/git/exec';

export interface WorktreeEntry {
    path: string;
    branch: string;
}

export async function getWorktrees(repoPath: string): Promise<WorktreeEntry[]> {
    const { stdout } = await execAuto(repoPath, ['worktree', 'list', '--porcelain']);
    const entries: WorktreeEntry[] = [];
    for (const block of stdout.trim().split(/\n\s*\n/)) {
        const worktreePath = block.match(/^worktree (.+)$/m)?.[1];
        const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] || '';
        if (worktreePath && branch) entries.push({ path: worktreePath, branch });
    }
    return entries;
}
