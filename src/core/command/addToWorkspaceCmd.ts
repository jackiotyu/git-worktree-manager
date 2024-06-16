import * as vscode from 'vscode';
import { verifyDirExistence } from '@/core/util/file';
import { treeDataEvent } from '@/core/event/events';
import { WorktreeItem, FolderItem } from '@/core/treeView/items';

export const addToWorkspace = (path: string) => {
    let success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(path),
        name: path,
    });
    if (success) treeDataEvent.fire();
};

export const addToWorkspaceCmd = async (item: WorktreeItem | FolderItem) => {
    if (!(await verifyDirExistence(item.path))) return;
    return addToWorkspace(item.path);
};
