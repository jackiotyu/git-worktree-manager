import { execAuto } from '@/core/git/exec';

export const createBranchFrom = async (cwd: string, branchName: string, base?: string) => {
    if (!base) return execAuto(cwd, ['branch', '-q', branchName]);
    return execAuto(cwd, ['branch', '-q', branchName, base]);
};
