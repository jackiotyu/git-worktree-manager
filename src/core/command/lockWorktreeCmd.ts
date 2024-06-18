import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorktreeCmd } from '@/core/command/commonWorktreeCmd';
import { getMainFolder } from '@/core/git/getMainFolder';

export const lockWorktreeCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    commonWorktreeCmd(item.path, Commands.lockWorktree, await getMainFolder(item.path));
};