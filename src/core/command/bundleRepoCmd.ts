import vscode from 'vscode';
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';
import { bundleRepo } from '@/core/git/bundleRepo';
import { getBaseBundleDir } from '@/core/util/folder';
import dayjs from 'dayjs';
import fs from 'fs/promises';
import path from 'path';
import { actionProgressWrapper } from '@/core/ui/progress';

export async function bundleRepoCmd(item: IWorktreeLess) {
    const baseBundleDir = getBaseBundleDir(item.fsPath);
    const bundlePath = path.join(baseBundleDir, `${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.bundle`);
    actionProgressWrapper(
        vscode.l10n.t('Bundling repository..., {path}', { path: bundlePath }),
        async () => {
            await fs.mkdir(baseBundleDir, { recursive: true });
            await bundleRepo(item.fsPath, bundlePath);
            Alert.showInformationMessage(vscode.l10n.t('Repository backup successful: {path}', { path: bundlePath }));
        },
        () => {}
    );
}
