import { verifyDirExistence } from '@/core/util/file';
import { addToWorkspace } from '@/core/util/workspace';
import { WorktreeItem, FolderItem } from '@/core/treeView/items';

export const addToWorkspaceCmd = async (item: WorktreeItem | FolderItem) => {
    const fsPath = item.fsPath;
    if (!(await verifyDirExistence(fsPath))) return;
    return addToWorkspace(fsPath);
};
