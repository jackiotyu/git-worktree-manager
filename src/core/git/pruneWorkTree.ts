import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';


export async function pruneWorkTree(dryRun: boolean = false, cwd?: string) {
    try {
        await execAuto(
            cwd,
            [WORK_TREE, 'prune', dryRun ? '--dry-run' : '', '-v'].filter((i) => i),
        );
        return [];
    } catch (error: any) {
        if (/Removing worktrees/.test(error.message)) {
            let text: string = error.message;
            let matched = text.matchAll(/Removing worktrees\/(.*):/g);
            let list = [];
            for (const worktreePath of matched) {
                list.push(worktreePath[1]);
            }

            return list;
        }
        throw error;
    }
}