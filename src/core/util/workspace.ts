import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import { treeDataEvent } from '@/core/event/events';
import { comparePath, toSimplePath, isSubPath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import type { IRecentlyOpened, IFolderItemConfig, IRecentFolder, IRecentWorkspace } from '@/types';
import { ContextKey } from '@/constants';
import { WorkspaceState } from '@/core/state';
import { getFolderConfig } from '@/core/util/state';
import { Config } from '@/core/config/setting';
import { updateWorkspaceMainFolders, updateWorkspaceListCache, updateWorktreeCache } from '@/core/util/cache';
import { gitApi } from '@/core/git/scmGit';
import path from 'path';
import { debounce } from 'lodash-es';
import logger from '@/core/log/logger';
import { worktreeEventRegister } from '@/core/event/git';
import type { Repository } from '@/@types/vscode.git';

export const formatWorkspacePath = (folder: string): string => {
    const baseName = path.basename(folder);
    const fullPath = folder;
    const templateStr = Config.get('workspacePathFormat', '$BASE_NAME - $FULL_PATH');
    return templateStr.replace(/\$FULL_PATH/g, fullPath).replace(/\$BASE_NAME/g, baseName);
};

export const addToWorkspace = (folder: string) => {
    return vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(folder),
        name: formatWorkspacePath(folder),
    });
};

export const removeFromWorkspace = (path: string) => {
    if (!vscode.workspace.workspaceFolders) return;
    const index = vscode.workspace.workspaceFolders.findIndex((item) => comparePath(item.uri.fsPath, path));
    if (index >= 0) vscode.workspace.updateWorkspaceFolders(index, 1);
};

export const isRecentFolder = (item: IRecentFolder | IRecentWorkspace): item is IRecentFolder => {
    const value = item as IRecentFolder;
    return value && value.folderUri && value.folderUri.scheme === 'file';
};

export const isRecentWorkspace = (item: IRecentFolder | IRecentWorkspace): item is IRecentWorkspace => {
    const value = item as IRecentWorkspace;
    return value && value.workspace && !!value.workspace.configPath;
};

export const getRecentItems = async (): Promise<Array<IRecentFolder | IRecentWorkspace>> => {
    const data = (await vscode.commands.executeCommand('_workbench.getRecentlyOpened')) as IRecentlyOpened;
    return data.workspaces;
};

export const getWorkspaceMainFolders = async (): Promise<IFolderItemConfig[]> => {
    const repoPathSet = new Set<string>();
    const workspaceFolders = [...folderRoot.folderPathSet];

    // TODO: Implement cache for saved folders
    // get saved folders from workspace state
    // const savedFolders = WorkspaceState.get('mainFolders', []).map((i) => i.path);
    // if (savedFolders.length) {
    //     workspaceFolders.push(...savedFolders);
    // }

    // Check if the workspace root folder itself is a Git repository
    for (const folder of workspaceFolders) {
        const mainFolder = await getMainFolder(folder);
        if (mainFolder) {
            repoPathSet.add(toSimplePath(mainFolder));
        }
    }

    // Check for Git repositories within the workspace (including subdirectories) using VS Code Git extension
    try {
        const scmGitApi = await gitApi.getAPI();
        if (scmGitApi) {
            for (const repo of scmGitApi.repositories) {
                const repoPath = toSimplePath(repo.rootUri.fsPath);
                const inWorkspace = workspaceFolders.some((folder) => {
                    return comparePath(repoPath, folder) || isSubPath(folder, repoPath);
                });
                if (inWorkspace) {
                    repoPathSet.add(repoPath);
                }
            }
        }
    } catch (error) {
        logger.error(String(error));
    }

    const folders = [...repoPathSet]
        .filter((folder) => folder)
        .sort((a, b) => a.localeCompare(b))
        .map((folder) => ({
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
    } catch (error) {
        logger.error(String(error));
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

// Watch VS Code Git Extension Repository Event,
// ensure the workspace Git repository cache is consistent with the Git extension
export const setupWatchGitRepoEvent = (): vscode.Disposable => {
    const disposables: vscode.Disposable[] = [];
    let disposed = false;
    const disposable: vscode.Disposable = {
        dispose: () => {
            disposed = true;
            disposables.forEach((disposable) => disposable.dispose());
        },
    };

    const handleRepositoryOpen = debounce(
        (repo: Repository) => {
            // Only care about the repositories in the workspace,
            // the specific filtering logic is in getWorkspaceMainFolders
            checkRoots();
            // Ensure the worktree event of the new repository is watched
            worktreeEventRegister.add(repo.rootUri);
        },
        1000,
        { leading: true },
    );

    const handleRepositoryClose = (repo: Repository) => {
        // Ensure the worktree event of the closed repository is un-watched
        worktreeEventRegister.remove(repo.rootUri);
        checkRoots();
    };

    gitApi.getAPI().then((api) => {
        if (!api) return;
        if (disposed) return;
        api.repositories.forEach((repo) => handleRepositoryOpen(repo));
        const openDisposable = api.onDidOpenRepository(handleRepositoryOpen);
        const closeDisposable = api.onDidCloseRepository(handleRepositoryClose);
        disposables.push(openDisposable, closeDisposable);
    });

    return disposable;
};
