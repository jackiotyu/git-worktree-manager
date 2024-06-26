import { addToGitFolder } from '@/core/command/addToGitFolder';
import { FolderItem } from '@/core/treeView/items';

export const addToGitFolderCmd = (item?: FolderItem) => {
    if (!item) return;
    return addToGitFolder(item.path);
};