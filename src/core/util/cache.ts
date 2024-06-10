import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getWorkspaceMainFolders } from '@/core/util/workspace';
import { WorkspaceState, GlobalState } from '@/core/state';
import type { IFolderItemConfig, IWorktreeCacheItem } from '@/types';

export const gitFolderToCaches = async (gitFolders: IFolderItemConfig[]): Promise<IWorktreeCacheItem[]> => {
    const worktreeList = await Promise.all(
        gitFolders.map(async (item) => {
            const list = await getWorktreeList(item.path, true);
            return [list, item] as const;
        }),
    );
    return worktreeList
        .map(([list, config]) => {
            return list.map<IWorktreeCacheItem>((row) => {
                return { ...row, label: config.name };
            });
        })
        .flat();
};

export const updateWorkspaceMainFolders = async () => {
    const folders = await getWorkspaceMainFolders();
    WorkspaceState.update('mainFolders', folders);
};

export const updateWorktreeCache = async () => {
    const gitFolders = GlobalState.get('gitFolders', []);
    let list: IWorktreeCacheItem[] = await gitFolderToCaches(gitFolders);
    GlobalState.update('workTreeCache', list);
};

export const updateWorkspaceListCache = async () => {
    if (WorkspaceState.get('mainFolders', []).length === 0) {
        await updateWorkspaceMainFolders();
    }
    const mainFolders = WorkspaceState.get('mainFolders', []);
    const cache = await gitFolderToCaches(mainFolders);
    WorkspaceState.update('workTreeCache', cache);
};