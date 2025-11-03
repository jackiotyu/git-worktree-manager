import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const openFavoriteCmd = () => {
    pickWorktree(DefaultDisplayList.favorites);
};
