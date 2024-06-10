import { updateTreeDataEvent } from '@/core/event/events';

export const refreshWorkTreeCmd = () => {
    updateTreeDataEvent.fire();
};