import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import { treeDataEvent } from '@/core/event/events';
import { comparePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import type { IRecentlyOpened, IFolderItemConfig } from '@/types';
import path from 'path';

export const addToWorkspace = (path: string) => {
    let success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(path),
        name: path,
    });
    if (success) {
        treeDataEvent.fire();
    }
};

export const removeFromWorkspace = (path: string) => {
    if (!vscode.workspace.workspaceFolders) return;
    let index = vscode.workspace.workspaceFolders.findIndex((item) => comparePath(item.uri.fsPath, path));
    if (index >= 0) vscode.workspace.updateWorkspaceFolders(index, 1);
};

export const getRecentFolders = async () => {
    let data = (await vscode.commands.executeCommand('_workbench.getRecentlyOpened')) as IRecentlyOpened;
    return data.workspaces.filter((item) => item.folderUri && item.folderUri.scheme === 'file');
};

export const getWorkspaceMainFolders = async (): Promise<IFolderItemConfig[]> => {
    const list = await Promise.all([...folderRoot.folderPathSet].map(async (folder) => await getMainFolder(folder)));
    const folders = [...new Set(list.filter((i) => i))].map((folder) => ({
        name: path.basename(folder),
        path: folder,
    }));
    return folders;
};