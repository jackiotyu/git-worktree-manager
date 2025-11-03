import { addToGitFolder } from '@/core/command/addToGitFolder';
import { IWorktreeLess } from '@/types';

export const addToGitFolderCmd = (item?: IWorktreeLess) => {
    if (!item) return;
    return addToGitFolder(item.fsPath);
};
