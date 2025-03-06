import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';

export function removeWorktree(path: string, forceDelete: boolean, cwd?: string) {
    let args = [WORK_TREE, 'remove'];
    if (forceDelete) args.push('--force');
    args.push(path);
    return execAuto(cwd, args);
}
