import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const openRecentCmd = () => {
    pickWorktree(DefaultDisplayList.recentlyOpened);
};
