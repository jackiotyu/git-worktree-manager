import { updateRecentEvent } from '@/core/event/events';

export const refreshRecentFolderCmd = async () => {
    updateRecentEvent.fire();
};