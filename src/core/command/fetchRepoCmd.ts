import { IWorktreeLess } from '@/types';
import { fetchRepo } from '@/core/git/fetchRepo';

export const fetchRepoCmd = (item: IWorktreeLess) => {
    fetchRepo(item.fsPath);
};
