import { execAuto } from '@/core/git/exec';

export const getLastCommitHash = async (cwd: string, short: boolean = true) => {
    try {
        const { stdout: output } = await execAuto(cwd, ['rev-parse', short ? '--short' : '', 'HEAD']);
        return output.trim();
    } catch {
        return '';
    }
};
