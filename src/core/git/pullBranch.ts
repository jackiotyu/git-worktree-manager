import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { actionProgressWrapper } from '@/core/ui/progress';
import type { PullPushArgs } from '@/types';

export const pullBranch = ({ remote, branch, remoteRef, cwd }: PullPushArgs) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Pull commit ( {0} → {1} ) on {2}', `${remote}/${remoteRef}`, branch, cwd),
        () => execAuto(cwd, ['pull'], token.token),
        () => {},
        token,
    );
};