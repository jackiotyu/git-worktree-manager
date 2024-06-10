import { WorkTreeItem } from '@/core/treeView/items';
import { fetchRemoteRef } from '@/core/git/fetchRemoteRef';

export const fetchWorkTreeCmd = (item: WorkTreeItem) => {
    const { path: cwd, remote, remoteRef } = item;
    if(!remote || !remoteRef) return;
    fetchRemoteRef({ cwd, remote, remoteRef });
};