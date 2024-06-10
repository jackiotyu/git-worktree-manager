import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';

export function unlockWorkTree(path: string, cwd?: string) {
    return execAuto(cwd, [WORK_TREE, 'unlock', path]);
}