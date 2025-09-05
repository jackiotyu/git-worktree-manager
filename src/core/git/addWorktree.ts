import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { checkoutBranch } from '@/core/git/checkoutBranch';
import { Alert } from '@/core/ui/message';
import { WORK_TREE } from '@/constants';

export async function addWorktree(path: string, branch: string, isBranch: boolean, cwd?: string) {
    try {
        await execAuto(cwd, [WORK_TREE, 'add', '-f', '--guess-remote', path, branch]);
        await checkoutBranch(path, branch, isBranch);
        return true;
    } catch (error: any) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to create worktree\n{0}', String(error)));
        return false;
    }
}
