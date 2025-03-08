import { execBase } from '@/core/git/exec';

export const bundleRepo = async (cwd: string, bundlePath: string) => {
    return execBase(cwd, ['bundle', 'create', bundlePath, '--all']);
};
