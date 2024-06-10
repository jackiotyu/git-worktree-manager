import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorktreeCmd } from '@/core/command/commonWorktreeCmd';

export const lockWorktreeCmd = (item?: WorktreeItem) => {
    if (!item) return;
    commonWorktreeCmd(item.path, Commands.lockWorktree, item.parent?.path);
};