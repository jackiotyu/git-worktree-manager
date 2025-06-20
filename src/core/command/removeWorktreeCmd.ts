import * as vscode from 'vscode';
// import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { removeWorktree } from '@/core/git/removeWorktree';
import { getCurrentBranch } from '@/core/git/getCurrentBranch';
import { getMainFolder } from '@/core/git/getMainFolder';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { Config } from '@/core/config/setting';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';
import { IBranchForWorktree, IWorktreeLess } from '@/types';

async function showDeleteConfirmation(worktreePath: string): Promise<'ok' | 'force' | undefined> {
    const ok = vscode.l10n.t('ok');
    const forceDelete = vscode.l10n.t('Force remove');

    const selected = await vscode.window.showWarningMessage(
        vscode.l10n.t('Remove worktree'),
        {
            modal: true,
            detail: vscode.l10n.t('The worktree for the {0} folder will be removed', worktreePath),
        },
        ok,
        forceDelete
    );

    if (selected === ok) return 'ok';
    if (selected === forceDelete) return 'force';
    return undefined;
}

async function getBranchInfo(worktreePath: string): Promise<{ branchName: string; mainFolder: string }> {
    try {
        const [branchName, mainFolder] = await Promise.all([
            getCurrentBranch(worktreePath),
            getMainFolder(worktreePath),
        ]);
        return { branchName, mainFolder };
    } catch {
        return { branchName: '', mainFolder: '' };
    }
}

export const removeWorktreeCmd = async (item?: IWorktreeLess): Promise<void> => {
    if (!item?.fsPath) return;

    const worktreePath = item.fsPath;
    const { promise, resolve } = withResolvers<void>();

    try {
        const confirmation = await showDeleteConfirmation(worktreePath);
        if (!confirmation) return;

        const needDeleteBranch = Config.get('promptDeleteBranchAfterWorktreeDeletion', false);
        const { branchName, mainFolder } = needDeleteBranch
            ? await getBranchInfo(worktreePath)
            : { branchName: '', mainFolder: '' };

        actionProgressWrapper(
            vscode.l10n.t('Removing worktree {path}', { path: worktreePath }),
            () => promise,
            () => {}
        );

        await removeWorktree(worktreePath, confirmation === 'force', mainFolder);
        resolve();

        Alert.showInformationMessage(
            vscode.l10n.t('Successfully removed the worktree for the {0} folder', worktreePath)
        );

        await vscode.commands.executeCommand(Commands.refreshWorktree);

        if (needDeleteBranch && branchName) {
            const branchInfo: IBranchForWorktree = { branch: branchName, mainFolder };
            await vscode.commands.executeCommand(Commands.deleteBranch, branchInfo);
        }
    } catch (error) {
        resolve();
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};
