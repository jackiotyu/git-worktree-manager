import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';

export function repairWorktree(path: string, cwd?: string) {
    return execAuto(cwd, [WORK_TREE, 'repair', path]);
}