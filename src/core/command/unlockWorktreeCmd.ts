import { WorktreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorktreeCmd } from '@/core/command/commonWorktreeCmd';

export const unlockWorktreeCmd = (item?: WorktreeItem) => {
    if (!item) return;
    commonWorktreeCmd(item.path, Commands.unlockWorktree, item.parent?.path);
};