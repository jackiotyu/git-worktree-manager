import { WorkTreeItem } from '@/core/treeView/items';
import { Commands } from '@/constants';
import { commonWorkTreeCmd } from '@/core/command/commonWorkTreeCmd';

export const repairWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.repairWorkTree, item.parent?.path);
};