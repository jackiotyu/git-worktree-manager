import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';

export function unlockWorktree(path: string, cwd?: string) {
    return execAuto(cwd, [WORK_TREE, 'unlock', path]);
}
