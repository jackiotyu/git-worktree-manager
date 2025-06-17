import { updateFavoriteEvent } from '@/core/event/events';

export const refreshFavoritesCmd = async () => {
    updateFavoriteEvent.fire();
};