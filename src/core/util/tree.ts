import { AllViewItem } from '@/core/treeView/items';
import { revealTreeItemEvent } from '@/core/event/events';

export const revealTreeItem = (item: AllViewItem) => {
    revealTreeItemEvent.fire(item);
    return new Promise((r) => process.nextTick(r));
};