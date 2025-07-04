import { execBase } from '@/core/git/exec';

export const getUpstream = async (cwd: string) => {
    const { stdout: upstream } = await execBase(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
    return upstream.trim();
};
