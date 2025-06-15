import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorktreeCmd } from '@/core/command/commonWorktreeCmd';
import { getMainFolder } from '@/core/git/getMainFolder';

export const repairWorktreeCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    commonWorktreeCmd(item.path, Commands.repairWorktree, await getMainFolder(item.path));
};
