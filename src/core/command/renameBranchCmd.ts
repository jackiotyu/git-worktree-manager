import { inputNewBranch } from '@/core/ui/inputNewBranch';
import { renameBranch } from '@/core/git/renameBranch';
import { Alert } from '@/core/ui/message';
import logger from '@/core/log/logger';
import { BranchForWorktree } from '@/types';

export const renameBranchCmd = async (item: BranchForWorktree) => {
    try {
        if(!item.mainFolder || !item.branch) return;
        const newBranchName = await inputNewBranch(item.mainFolder, item.branch);
        if (!newBranchName) return;
        await renameBranch(item.mainFolder, item.branch, newBranchName);
    } catch (error) {
        logger.error(error);
        Alert.showInformationMessage(`${error}`);
    }
};
