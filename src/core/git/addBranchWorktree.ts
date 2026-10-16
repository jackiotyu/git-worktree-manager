import fs from 'fs/promises';
import { execAuto } from '@/core/git/exec';
import { addWorktreeRaw } from '@/core/git/addWorktree';
import { pathExists } from '@/core/util/fs';
import { isRegisteredWorktree } from '@/core/util/multiRepositoryWorktree';

async function createOrAttachWorktree(
    repoPath: string,
    targetPath: string,
    operation: () => Promise<void>,
): Promise<void> {
    const targetExisted = await pathExists(targetPath);
    let safeToClean = !targetExisted;
    if (targetExisted) {
        try {
            safeToClean = (await fs.stat(targetPath)).isDirectory() && (await fs.readdir(targetPath)).length === 0;
        } catch {
            safeToClean = false;
        }
    }

    try {
        await operation();
    } catch (error) {
        if (safeToClean) {
            try {
                if (await isRegisteredWorktree(repoPath, targetPath)) {
                    await execAuto(repoPath, ['worktree', 'remove', '--force', targetPath]);
                    if (targetExisted) {
                        await fs.mkdir(targetPath, { recursive: true });
                    }
                }
            } catch (cleanupError) {
                throw new Error(
                    `Worktree creation failed: ${String(error)}. Failed to clean up ${targetPath}: ${String(cleanupError)}`,
                );
            }
        }
        throw error;
    }
}

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
        await createOrAttachWorktree(repoPath, targetPath, () => addWorktreeRaw(targetPath, branch, true, repoPath));
        return;
    }

    await createOrAttachWorktree(repoPath, targetPath, async () => {
        await execAuto(repoPath, ['worktree', 'add', '-b', branch, targetPath, ...(startPoint ? [startPoint] : [])]);
    });
}
