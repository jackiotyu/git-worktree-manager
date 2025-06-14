import { execBase } from '@/core/git/exec';

export function getNameRev(cwd: string) {
    return execBase(cwd, ['describe', '--all']).then(res => res.stdout);
}

export function getNameRevSafe(cwd: string) {
    return getNameRev(cwd).catch(() => '');
}
