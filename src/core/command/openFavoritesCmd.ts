import { pickWorktree } from "@/core/quickPick/pickWorktree";
import { DefaultDisplayList } from '@/types';

export const openFavoritesCmd = () => {
    pickWorktree(DefaultDisplayList.favorite);
};