import * as vscode from "vscode";
import { checkFolderExist } from '@/core/util/file';
import { treeDataEvent } from '@/core/event/events';
import { WorkTreeItem, FolderItem } from '@/core/treeView/items';

export const addToWorkspace = (path: string) => {
    let success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(path),
        name: path,
    });
    if (success) {
        treeDataEvent.fire();
    }
};

export const addToWorkspaceCmd = async (item: WorkTreeItem | FolderItem) => {
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    return addToWorkspace(item.path);
};
