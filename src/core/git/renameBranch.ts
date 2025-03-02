import { execBase } from '@/core/git/exec';

export function renameBranch(cwd: string, branchName: string, newBranchName: string) {
    return execBase(cwd, ['branch', '-m', branchName, newBranchName]);
}
