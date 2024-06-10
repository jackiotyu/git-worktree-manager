import { worktreeEventRegister } from '@/core/event/git';

export const unwatchWorktreeEventCmd = () => {
    worktreeEventRegister.dispose();
};
