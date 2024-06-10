import { WorkTreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorkTreeCmd } from '@/core/command/commonWorkTreeCmd';

export const lockWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.lockWorkTree, item.parent?.path);
};