import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { actionProgressWrapper } from '@/core/ui/progress';
import type { FetchArgs } from '@/types';

export const fetchRemoteRef = ({ remote, remoteRef, cwd }: FetchArgs) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Fetch remote ( {0} ) on {1}', `${remote}/${remoteRef}`, cwd),
        () => execAuto(cwd, ['fetch', remote, remoteRef], token.token),
        () => {},
        token,
    );
};
