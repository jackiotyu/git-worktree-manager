import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';

export async function checkGitValid(folderPath: string = folderRoot.uri?.fsPath || '') {
    try {
        await execBase(folderPath, ['rev-parse', '--is-inside-work-tree']);
        return true;
    } catch {
        return false;
    }
}
