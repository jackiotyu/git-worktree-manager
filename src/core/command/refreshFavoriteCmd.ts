import { updateFavoriteEvent } from '@/core/event/events';

export const refreshFavoriteCmd = async () => {
    updateFavoriteEvent.fire();
};
