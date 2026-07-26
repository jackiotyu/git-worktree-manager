import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const searchAllWorktreeCmd = (args: unknown) => {
    if (args === 'auto') pickWorktree();
    else pickWorktree(DefaultDisplayList.all);
};
