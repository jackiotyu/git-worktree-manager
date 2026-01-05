import * as vscode from 'vscode';
// import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { removeWorktree } from '@/core/git/removeWorktree';
import { getCurrentBranch } from '@/core/git/getCurrentBranch';
import { getMainFolder } from '@/core/git/getMainFolder';
import { getChanges } from '@/core/git/getChanges';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { Config } from '@/core/config/setting';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';
import { IBranchForWorktree, IWorktreeLess } from '@/types';

async function showDeleteConfirmation(worktreePath: string): Promise<'remove' | 'force' | undefined> {
    const remove = vscode.l10n.t('Remove');
    const forceDelete = vscode.l10n.t('Force remove');

    let detail = vscode.l10n.t('The worktree for the {0} folder will be removed', worktreePath);
    const changes = await getChanges(worktreePath);
    if (changes.length) {
        detail += '\n\n';
        detail += vscode.l10n.t('Contains uncommitted changes:\n\n{changes}', {
            changes: changes.map((change) => change.raw).join('\n'),
        });
    }

    const selected = await vscode.window.showWarningMessage(
        vscode.l10n.t('Remove Worktree'),
        {
            modal: true,
            detail: detail,
        },
        remove,
        forceDelete,
    );

    if (selected === remove) return 'remove';
    if (selected === forceDelete) return 'force';
    return undefined;
}

export const removeWorktreeCmd = async (item?: IWorktreeLess): Promise<void> => {
    if (!item?.fsPath) return;

    const worktreePath = item.fsPath;
    const { promise, resolve } = withResolvers<void>();

    try {
        const confirmation = await showDeleteConfirmation(worktreePath);
        if (!confirmation) return;
        const isForceDelete = confirmation === 'force';

        const needDeleteBranch = Config.get('promptDeleteBranchAfterWorktreeDeletion', false);
        const mainFolder = await getMainFolder(worktreePath);

        actionProgressWrapper(
            vscode.l10n.t('Removing worktree {path}', { path: worktreePath }),
            () => promise,
            () => {},
        );
        await removeWorktree(worktreePath, isForceDelete, mainFolder);
        resolve();

        Alert.showInformationMessage(
            vscode.l10n.t('Successfully removed the worktree for the {0} folder', worktreePath),
        );

        await vscode.commands.executeCommand(Commands.refreshWorktree);

        if (needDeleteBranch) {
            const branchName = await getCurrentBranch(worktreePath);
            if (branchName) {
                const branchInfo: IBranchForWorktree = { branch: branchName, mainFolder };
                await vscode.commands.executeCommand(Commands.deleteBranch, branchInfo);
            }
        }
    } catch (error) {
        resolve();
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};
