import { WorktreeItem } from '@/core/treeView/items';
import { pullOrPushAction } from '@/core/ui/pullOrPushAction';

export const pushWorktreeCmd = (item?: WorktreeItem) => {
    if (!item || !item.remoteRef || !item.remote) return;
    pullOrPushAction('push', {
        branch: item.name,
        cwd: item.path,
        remote: item.remote,
        remoteRef: item.remoteRef,
    });
};