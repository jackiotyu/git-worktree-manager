import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { actionProgressWrapper } from '@/core/ui/progress';

export const deleteBranch = async (cwd: string, branchName: string) => {
    const token = new vscode.CancellationTokenSource();
    await actionProgressWrapper(
        vscode.l10n.t('Deleting branch {1}', branchName),
        () => execAuto(cwd, ['branch', '-d', branchName], token.token),
        () => {},
        token,
    );
};