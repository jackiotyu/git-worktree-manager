import { removeFromWorkspace } from '@/core/util/workspace';
import { WorkTreeItem } from '@/core/treeView/items';

export const removeFromWorkspaceCmd = async (item: WorkTreeItem) => {
    return removeFromWorkspace(item.path);
};