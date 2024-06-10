import { WorkTreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorkTreeCmd } from '@/core/command/commonWorkTreeCmd';

export const unlockWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.unlockWorkTree, item.parent?.path);
};