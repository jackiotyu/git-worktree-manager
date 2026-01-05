import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getRecentItems, getWorkspaceMainFolders, isRecentWorkspace, isRecentFolder } from '@/core/util/workspace';
import { comparePath, toSimplePath } from '@/core/util/folder';
import { WorkspaceState, GlobalState } from '@/core/state';
import { groupBy } from 'lodash-es';
import type { IFolderItemConfig, IWorktreeCacheItem, IRecentItemCache, IRecentItem } from '@/types';
import { RecentItemType } from '@/constants';
import path from 'path';

export const gitFolderToCache = async (item: IFolderItemConfig): Promise<IWorktreeCacheItem[]> => {
    const list = await getWorktreeList(item.path);
    return list.map<IWorktreeCacheItem>((row) => {
        return { ...row, label: item.name };
    });
};

export const updateWorkspaceMainFolders = async () => {
    const folders = await getWorkspaceMainFolders();
    WorkspaceState.update('mainFolders', folders);
};

const getUpdatedWorktreeCache = async (
    repoPath: string,
    configList: IFolderItemConfig[],
    preWorkTreeCache: IWorktreeCacheItem[],
) => {
    const nextWorkTreeCache: IWorktreeCacheItem[] = [];
    const preCacheGroup = groupBy(
        preWorkTreeCache
            .filter((i) => i.mainFolder)
            .map((item) => ({ ...item, mainFolder: toSimplePath(item.mainFolder) })),
        'mainFolder',
    );
    for (const item of configList) {
        const current = toSimplePath(item.path);
        if (comparePath(repoPath, current)) {
            nextWorkTreeCache.push(...(await gitFolderToCache(item))); // 更新指定仓库
            continue;
        }
        const caches = preCacheGroup[current];
        if (caches && caches.length > 0) {
            nextWorkTreeCache.push(...caches); // 使用旧缓存
        } else {
            nextWorkTreeCache.push(...(await gitFolderToCache(item))); // 没有旧缓存，直接更新
        }
    }
    return nextWorkTreeCache;
};

export const updateWorktreeCache = async (repoPath: string | void) => {
    const gitFolders = GlobalState.get('gitFolders', []);
    if (repoPath) {
        const nextCache = await getUpdatedWorktreeCache(repoPath, gitFolders, GlobalState.get('workTreeCache', []));
        GlobalState.update('workTreeCache', nextCache);
        return;
    }

    const mainFolderSet = new Set(WorkspaceState.get('mainFolders', []).map((i) => toSimplePath(i.path)));
    // TODO 优先更新工作区内的仓库
    const sortedFolders = [...gitFolders].sort((a) => {
        if (mainFolderSet.has(toSimplePath(a.path))) return -1;
        return 0;
    });
    for (const item of sortedFolders) {
        const nextCache = await getUpdatedWorktreeCache(item.path, gitFolders, GlobalState.get('workTreeCache', []));
        GlobalState.update('workTreeCache', nextCache);
    }
};

export const updateWorkspaceListCache = async (repoPath: string | void) => {
    if (WorkspaceState.get('mainFolders', []).length === 0) {
        await updateWorkspaceMainFolders();
    }
    const mainFolders = WorkspaceState.get('mainFolders', []);
    if (repoPath) {
        const nextCache = await getUpdatedWorktreeCache(repoPath, mainFolders, WorkspaceState.get('workTreeCache', []));
        WorkspaceState.update('workTreeCache', nextCache);
        return;
    }

    for (const item of mainFolders) {
        const nextCache = await getUpdatedWorktreeCache(
            item.path,
            mainFolders,
            WorkspaceState.get('workTreeCache', []),
        );
        WorkspaceState.update('workTreeCache', nextCache);
    }
};

export const updateRecentItems = async () => {
    const list = await getRecentItems();
    GlobalState.update('global.recentItemCache', {
        time: +new Date(),
        list: list
            .filter((item) => isRecentWorkspace(item) || isRecentFolder(item))
            .map((item) => {
                if (isRecentFolder(item)) {
                    return {
                        path: item.folderUri.toString(),
                        remoteAuthority: item.remoteAuthority,
                        type: RecentItemType.folder,
                        label: item.label || path.basename(item.folderUri.fsPath),
                    };
                } else {
                    return {
                        path: item.workspace.configPath.toString(),
                        remoteAuthority: item.remoteAuthority,
                        type: RecentItemType.workspace,
                        label: item.label || path.basename(item.workspace.configPath.path),
                    };
                }
            }),
    });
};

export const getRecentItemCache = (): IRecentItemCache => {
    const res = GlobalState.get('global.recentItemCache', { time: -1, list: [] });
    return res;
};

export const getFavoriteCache = (): IRecentItem[] => {
    return GlobalState.get('global.favorite', []);
};

export const updateFavoriteCache = (value: IRecentItem[]) => {
    return GlobalState.update('global.favorite', value);
};

export const checkRecentFolderCache = () => {
    const res = GlobalState.get('global.recentItemCache', { time: -1, list: [] });
    if (+new Date() - res.time > 5000) updateRecentItems();
};
