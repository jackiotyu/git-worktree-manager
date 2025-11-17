import * as vscode from 'vscode';
import { pickGitFolder } from '@/core/ui/pickGitFolder';
import type { IWorktreeLess, IBranchForWorktree } from '@/types';
import { Alert } from '@/core/ui/message';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { createWorktreeFromInfo } from '@/core/command/createWorktreeFromInfo';
import { getMainFolder } from '@/core/git/getMainFolder';
import { inputWorktreeDir } from '@/core/ui/inputWorktreeDir';

const pickBranchItem = async (dir: string, mainFolder: string) => {
    let branchItem = await pickBranch({
        title: vscode.l10n.t('Create Worktree ({0})', dir.length > 35 ? `...${dir.slice(-34)}` : dir),
        placeholder: vscode.l10n.t('Choose a branch to create a new worktree from'),
        mainFolder,
        cwd: dir,
        step: 1,
        totalSteps: 2,
        showCreate: true,
    });
    return branchItem;
};

const normalizeRefName = (branchItem: IBranchForWorktree) => (branchItem.branch || branchItem.hash || '').replace(/[\\/]/g, '-');

export const addWorktreeCmd = async (item?: IWorktreeLess) => {
    let gitFolder =
        item?.fsPath || (await pickGitFolder(vscode.l10n.t('Select Git repository to create worktree from')));
    if (gitFolder === null) {
        Alert.showErrorMessage(vscode.l10n.t('Please open at least one Git repository in workspace'));
    }
    if (!gitFolder) return false;
    const mainFolder = await getMainFolder(gitFolder);
    if (!mainFolder) return false;

    // Select ref
    let branchItem = await pickBranchItem(gitFolder, mainFolder);
    if (!branchItem) return false;
    let refName = normalizeRefName(branchItem);

    // Select folder
    let folderPath = await inputWorktreeDir({
        baseDir: mainFolder,
        step: 2,
        totalSteps: 2,
        hasBackButton: true,
        refName,
    });
    while (folderPath === void 0) {
        // If no folder is selected, return to selecting ref
        branchItem = await pickBranchItem(gitFolder, mainFolder);
        if (!branchItem) return false;
        refName = normalizeRefName(branchItem);
        folderPath = await inputWorktreeDir({
            baseDir: mainFolder,
            baseWorktreeDir: folderPath,
            step: 2,
            totalSteps: 2,
            hasBackButton: true,
            refName,
        });
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
