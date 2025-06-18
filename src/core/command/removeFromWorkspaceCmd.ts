import { removeFromWorkspace } from '@/core/util/workspace';
import { WorktreeItem } from '@/core/treeView/items';

export const removeFromWorkspaceCmd = async (item: WorktreeItem) => {
    return removeFromWorkspace(item.fsPath);
};