import { GitFolderItem } from '@/core/treeView/items';
import { fetchRepo } from '@/core/git/fetchRepo';

export const fetchRepoCmd = (item: GitFolderItem) => {
    fetchRepo(item.path);
};