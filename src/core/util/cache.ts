import { getWorkTreeList } from '@/core/git/getWorkTreeList';
import { getWorkspaceMainFolders } from '@/core/util/workspace';
import { WorkspaceState, GlobalState } from '@/core/state';
import type { IFolderItemConfig, IWorkTreeCacheItem } from '@/types';

export const gitFolderToCaches = async (gitFolders: IFolderItemConfig[]): Promise<IWorkTreeCacheItem[]> => {
    const worktreeList = await Promise.all(
        gitFolders.map(async (item) => {
            const list = await getWorkTreeList(item.path, true);
            return [list, item] as const;
        }),
    );
    return worktreeList
        .map(([list, config]) => {
            return list.map<IWorkTreeCacheItem>((row) => {
                return { ...row, label: config.name };
            });
        })
        .flat();
};

export const updateWorkspaceMainFolders = async () => {
    const folders = await getWorkspaceMainFolders();
    WorkspaceState.update('mainFolders', folders);
};

export const updateWorkTreeCache = async () => {
    const gitFolders = GlobalState.get('gitFolders', []);
    let list: IWorkTreeCacheItem[] = await gitFolderToCaches(gitFolders);
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