import { execAuto } from '@/core/git/exec';
import { addWorktreeRaw } from '@/core/git/addWorktree';

export async function addBranchWorktree(
    repoPath: string,
    targetPath: string,
    branch: string,
    startPoint?: string,
): Promise<void> {
    const localBranch = await execAuto(repoPath, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).then(
        () => true,
        () => false,
    );
    const remoteBranches = (
        await execAuto(repoPath, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes'])
    ).stdout
        .split(/\r?\n/)
        .filter((ref) => ref.endsWith(`/${branch}`) && !ref.endsWith('/HEAD'));

    if (remoteBranches.length > 1 && !localBranch) {
        throw new Error(
            `Branch "${branch}" matches multiple remote branches in ${repoPath}; specify a unique branch name.`,
        );
    }

    if (localBranch || remoteBranches.length === 1) {
        await addWorktreeRaw(targetPath, branch, true, repoPath);
        return;
    }

    await execAuto(repoPath, ['worktree', 'add', '-b', branch, targetPath, ...(startPoint ? [startPoint] : [])]);
}
