import { execAuto } from '@/core/git/exec';

export async function getRemoteList(cwd: string) {
    try {
        let output = await execAuto(cwd, ['remote', '-v']);
        return output.split('\n').filter((i) => i);
    } catch {
        return [];
    }
}