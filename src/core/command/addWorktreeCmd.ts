import * as vscode from "vscode";
import { pickGitFolder } from '@/core/ui/pickGitFolder';
import type { IWorktreeLess } from '@/types';
import { Alert } from '@/core/ui/message';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { createWorktreeFromInfo } from '@/core/command/createWorktreeFromInfo';
import { getMainFolder } from '@/core/git/getMainFolder';

export const addWorktreeCmd = async (item?: IWorktreeLess) => {
    let gitFolder = item?.path || (await pickGitFolder());
    if (gitFolder === null) Alert.showErrorMessage(vscode.l10n.t('Please open a git repository in workspace'));
    if (!gitFolder) return false;
    const mainFolder = await getMainFolder(gitFolder);
    if(!mainFolder) return false;
    let branchItem = await pickBranch(
        vscode.l10n.t('Create Worktree ({0})', gitFolder.length > 35 ? `...${gitFolder.slice(-34)}` : gitFolder),
        vscode.l10n.t('Choose a branch to create new worktree for'),
        mainFolder,
        gitFolder,
    );
    // FIXME 改造quickPick
    if (branchItem === void 0) return;
    if (!branchItem) return false;
    let { branch, hash } = branchItem;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(gitFolder),
        openLabel: vscode.l10n.t('Select the folder'),
        title: vscode.l10n.t('Select the folder where you want to create the worktree?'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    let label = branch ? vscode.l10n.t('branch') : vscode.l10n.t('commit hash');
    await createWorktreeFromInfo({
        name: branch || hash || '',
        label,
        folderPath,
        isBranch: !!branch,
        cwd: gitFolder,
    });
};