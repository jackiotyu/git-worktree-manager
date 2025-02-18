import * as vscode from 'vscode';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getRecentFolders, getWorkspaceMainFolders } from '@/core/util/workspace';
import { comparePath, toSimplePath } from '@/core/util/folder';
import { WorkspaceState, GlobalState } from '@/core/state';
import { groupBy } from 'lodash-es';
import type { IFolderItemConfig, IWorktreeCacheItem, IRecentUriCache, IWorktreeDetail } from '@/types';

export const gitFolderToCache = async (item: IFolderItemConfig): Promise<IWorktreeCacheItem[]> => {
    const worktreeList: [IWorktreeDetail[], IFolderItemConfig][] = [];
    const list = await getWorktreeList(item.path, true);
    worktreeList.push([list, item] as const);
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
        preWorkTreeCache.filter(i => i.mainFolder).map((item) => ({ ...item, mainFolder: toSimplePath(item.mainFolder) })),
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
    const sortedFolders = [...gitFolders].sort((a, b) => {
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

export const updateRecentFolders = async () => {
    const list = await getRecentFolders();
    GlobalState.update('global.recentFolderCache', {
        time: +new Date(),
        list: list.map((i) => i.folderUri.toString()),
    });
};

export const getRecentFolderCache = (): IRecentUriCache => {
    const res = GlobalState.get('global.recentFolderCache', { time: -1, list: [] });
    return {
        time: res.time,
        list: res.list.map((str) => vscode.Uri.parse(str)),
    };
};

export const checkRecentFolderCache = () => {
    const res = GlobalState.get('global.recentFolderCache', { time: -1, list: [] });
    if (+new Date() - res.time > 5000) updateRecentFolders();
};
