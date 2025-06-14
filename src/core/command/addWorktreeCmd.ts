import * as vscode from 'vscode';
import { pickGitFolder } from '@/core/ui/pickGitFolder';
import type { IWorktreeLess } from '@/types';
import { Alert } from '@/core/ui/message';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { createWorktreeFromInfo } from '@/core/command/createWorktreeFromInfo';
import { getMainFolder } from '@/core/git/getMainFolder';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';

const pickBranchItem = async (dir: string, mainFolder: string) => {
    let branchItem = await pickBranch({
        title: vscode.l10n.t('Create Worktree ({0})', dir.length > 35 ? `...${dir.slice(-34)}` : dir),
        placeholder: vscode.l10n.t('Choose a branch to create new worktree for'),
        mainFolder,
        cwd: dir,
        step: 2,
        totalSteps: 2,
        showCreate: true,
    });
    return branchItem;
};

export const addWorktreeCmd = async (item?: IWorktreeLess) => {
    let gitFolder = item?.path || (await pickGitFolder(vscode.l10n.t('Select git repository for create worktree')));
    if (gitFolder === null) Alert.showErrorMessage(vscode.l10n.t('Please open a git repository in workspace'));
    if (!gitFolder) return false;
    const mainFolder = await getMainFolder(gitFolder);
    if (!mainFolder) return false;

    // 选择文件夹
    let folderPath = await inputWorktreeDir({ baseDir: mainFolder, step: 1, totalSteps: 2 });
    if (!folderPath) return;

    // 选择ref
    let branchItem = await pickBranchItem(gitFolder, mainFolder);
    // FIXME 改造quickPick
    // 没有选择ref时，返回选择文件夹
    while (branchItem === void 0) {
        folderPath = await inputWorktreeDir({
            baseDir: mainFolder,
            baseWorktreeDir: folderPath,
            step: 1,
            totalSteps: 2,
        });
        if (!folderPath) return;
        branchItem = await pickBranchItem(gitFolder, mainFolder);
    }

    if (!branchItem) return false;
    let { branch, hash } = branchItem;
    let label = branch ? vscode.l10n.t('branch') : vscode.l10n.t('commit hash');
    await createWorktreeFromInfo({
        name: branch || hash || '',
        label,
        folderPath,
        isBranch: !!branch,
        cwd: mainFolder,
    });
};
