import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const openAllWorktreeCmd = () => {
    pickWorktree(DefaultDisplayList.all);
};
