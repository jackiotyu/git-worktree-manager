import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorktreeCmd } from '@/core/command/commonWorktreeCmd';

export const repairWorktreeCmd = (item?: WorktreeItem) => {
    if (!item) return;
    commonWorktreeCmd(item.path, Commands.repairWorktree, item.path);
};