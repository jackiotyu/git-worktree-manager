import { ILoadMoreItem } from '@/types';
import { loadAllTreeDataEvent } from '@/core/event/events';

export const loadAllTreeDataCmd = (item?: ILoadMoreItem) => {
    if (!item) return;
    loadAllTreeDataEvent.fire(item.viewId);
};