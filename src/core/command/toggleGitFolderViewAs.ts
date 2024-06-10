import { toggleGitFolderViewAsEvent } from '@/core/event/events';

export const toggleGitFolderViewAs = (asTree: boolean) => {
    toggleGitFolderViewAsEvent.fire(asTree);
};