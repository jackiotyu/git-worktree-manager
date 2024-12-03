import { verifyDirExistence } from '@/core/util/file';
import { addToWorkspace } from '@/core/util/workspace';
import { WorktreeItem, FolderItem } from '@/core/treeView/items';

export const addToWorkspaceCmd = async (item: WorktreeItem | FolderItem) => {
    if (!(await verifyDirExistence(item.path))) return;
    return addToWorkspace(item.path);
};
