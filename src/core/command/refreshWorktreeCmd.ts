import { updateTreeDataEvent } from '@/core/event/events';

export const refreshWorktreeCmd = () => {
    updateTreeDataEvent.fire();
};
