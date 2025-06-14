import { execAuto } from '@/core/git/exec';

export async function getCurrentBranch(cwd: string) {
    try {
        const { stdout: output } = await execAuto(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
        const branch = output.trim();
        return branch === 'HEAD' ? '' : branch;
    } catch {
        return '';
    }
}
