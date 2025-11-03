import { updateFolderEvent } from '@/core/event/events';

export const refreshGitFolderCmd = () => {
    updateFolderEvent.fire();
};
