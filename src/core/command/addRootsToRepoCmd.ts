import folderRoot from '@/core/folderRoot';
import { addToGitFolder } from '@/core/command/addToGitFolder';
import { addDirsToRepo } from '@/core/command/addDirsToRepo';

export const addRootsToRepoCmd = () => {
    const folderPathSet = folderRoot.folderPathSet;
    const dirs = [...folderPathSet];
    if (folderPathSet.size === 1) {
        addToGitFolder(dirs[0]);
    } else {
        addDirsToRepo(dirs);
    }
};
