import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { actionProgressWrapper } from '@/core/ui/progress';
import type { PullPushArgs } from '@/types';

export const pushBranch = ({ remote, branch, remoteRef, cwd }: PullPushArgs) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Push commit ( {0} → {1} ) on {2}', branch, `${remote}/${remoteRef}`, cwd),
        () => execAuto(cwd, ['push'], token.token),
        () => {},
        token,
    );
};