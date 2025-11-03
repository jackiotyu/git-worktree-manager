import { pickWorktree } from '@/core/quickPick/pickWorktree';
import { DefaultDisplayList } from '@/types';

export const openWorkspaceWorktreeCmd = () => {
    pickWorktree(DefaultDisplayList.workspace);
};
