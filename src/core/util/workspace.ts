import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import { treeDataEvent } from '@/core/event/events';
import { comparePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import type { IRecentlyOpened, IFolderItemConfig } from '@/types';
import { ContextKey } from '@/constants';
import { WorkspaceState } from '@/core/state';
import { getFolderConfig } from '@/core/util/state';
import { toSimplePath } from '@/core/util/folder';
import { updateWorkspaceMainFolders, updateWorkspaceListCache } from '@/core/util/cache';
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

export const updateAddDirsContext = () => {
    let canAdd = false;
    try {
        const dirs = WorkspaceState.get('mainFolders', []).map((i) => i.path);
        const distinctFolders = [...new Set(dirs.filter((i) => i))];
        if (!dirs.length) return;
        const existFolders = getFolderConfig();
        const existFoldersMap = new Map(existFolders.map((i) => [toSimplePath(i.path), true]));
        const gitFolders = distinctFolders.filter((i) => i && !existFoldersMap.has(toSimplePath(i))) as string[];
        if (gitFolders.length) canAdd = true;
    } finally {
        vscode.commands.executeCommand('setContext', ContextKey.addRootsToRepo, canAdd);
    }
};

export const checkRoots = async () => {
    await new Promise(resolve => process.nextTick(resolve));
    await updateWorkspaceMainFolders();
    await Promise.all([
        updateAddDirsContext(),
        updateWorkspaceListCache(),
    ]);
    treeDataEvent.fire();
};