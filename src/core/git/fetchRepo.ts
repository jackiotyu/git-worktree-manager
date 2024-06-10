import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { actionProgressWrapper } from '@/core/ui/progress';

export const fetchRepo = (cwd: string) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Fetch all remote commit on {1}', cwd),
        () => execAuto(cwd, ['fetch', '--all'], token.token),
        () => {},
        token,
    );
};
