import { WorktreeItem } from '@/core/treeView/items';
import { fetchRemoteRef } from '@/core/git/fetchRemoteRef';

export const fetchWorktreeCmd = (item: WorktreeItem) => {
    const { path: cwd, remote, remoteRef } = item;
    if(!remote || !remoteRef) return;
    fetchRemoteRef({ cwd, remote, remoteRef });
};