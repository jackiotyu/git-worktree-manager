import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import { treeDataEvent } from '@/core/event/events';
import { comparePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import type { IRecentlyOpened, IFolderItemConfig } from '@/types';
import { ContextKey } from '@/constants';
import { WorkspaceState } from '@/core/state';
import { getFolderConfig } from '@/core/util/state';
import { Config } from '@/core/config/setting';
import { toSimplePath } from '@/core/util/folder';
import { updateWorkspaceMainFolders, updateWorkspaceListCache, updateWorktreeCache } from '@/core/util/cache';
import path from 'path';
import { debounce } from 'lodash-es';

export const formatWorkspacePath = (folder: string): string => {
    const baseName = path.basename(folder);
    const fullPath = folder;
    const templateStr = Config.get('workspacePathFormat', '$FULL_PATH');
    return templateStr.replace('$FULL_PATH', fullPath).replace('$BASE_NAME', baseName);
};

export const addToWorkspace = (folder: string) => {
    return vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(folder),
        name: formatWorkspacePath(folder),
    });
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
    let list: string[] = [];
    for (const folder of folderRoot.folderPathSet) {
        const mainFolder = await getMainFolder(folder);
        list.push(mainFolder);
    }
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

export const checkRoots = debounce(
    async () => {
        await new Promise((resolve) => process.nextTick(resolve));
        await updateWorkspaceMainFolders();
        await Promise.all([
            Promise.resolve(updateAddDirsContext()).finally(() => {
                treeDataEvent.fire();
            }),
            updateWorkspaceListCache(),
            updateWorktreeCache(),
        ]);
    },
    300,
    { leading: true },
);
