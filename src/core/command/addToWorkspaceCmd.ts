import { verifyDirExistence } from '@/core/util/file';
import { addToWorkspace } from '@/core/util/workspace';
import { IWorktreeLess } from '@/types';

export const addToWorkspaceCmd = async (item: IWorktreeLess) => {
    const fsPath = item.fsPath;
    if (!(await verifyDirExistence(fsPath))) return;
    return addToWorkspace(fsPath);
};
