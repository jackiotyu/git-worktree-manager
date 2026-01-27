import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const searchAllWorktreeCmd = () => {
    pickWorktree(DefaultDisplayList.all);
};
