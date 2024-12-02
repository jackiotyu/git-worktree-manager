import { refreshWorktreeCacheEvent } from '@/core/event/events';
import { RefreshCacheType } from '@/constants';

export const refreshWorktreeCacheCmd = (type: RefreshCacheType) => {
    refreshWorktreeCacheEvent.fire(type);
};