import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';

export function moveWorkTree(oldPath: string, newPath: string, cwd?: string) {
    return execAuto(cwd, [WORK_TREE, 'move', oldPath, newPath]);
}