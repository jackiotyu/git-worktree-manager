import * as vscode from 'vscode';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { getRecentFolders, getWorkspaceMainFolders } from '@/core/util/workspace';
import { comparePath } from '@/core/util/folder';
import { WorkspaceState, GlobalState } from '@/core/state';
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

const getUpdatedWorktreeCache = async (repoPath: string | void, configList: IFolderItemConfig[], preWorkTreeCache: IWorktreeCacheItem[]) => {
    const nextWorkTreeCache: IWorktreeCacheItem[] = [];
    for (const item of configList) {
        if(!repoPath) {
            nextWorkTreeCache.push(...await gitFolderToCache(item)); // 直接更新全部
            continue;
        }

        if(comparePath(repoPath, item.path)) {
            nextWorkTreeCache.push(...await gitFolderToCache(item)); // 更新指定仓库
            continue;
        }

        const items = preWorkTreeCache.filter(i => comparePath(i.mainFolder, item.path));
        if(items.length) {
            nextWorkTreeCache.push(...items); // 使用旧缓存
        } else {
            nextWorkTreeCache.push(...await gitFolderToCache(item)); // 没有旧缓存，直接更新
        }
    }
    return nextWorkTreeCache;
};

export const updateWorktreeCache = async (repoPath: string | void) => {
    const gitFolders = GlobalState.get('gitFolders', []);
    const preWorkTreeCache = GlobalState.get('workTreeCache', []);
    const nextWorkTreeCache = await getUpdatedWorktreeCache(repoPath, gitFolders, preWorkTreeCache);
    GlobalState.update('workTreeCache', nextWorkTreeCache);
};

export const updateWorkspaceListCache = async (repoPath: string | void) => {
    if (WorkspaceState.get('mainFolders', []).length === 0) {
        await updateWorkspaceMainFolders();
    }
    const mainFolders = WorkspaceState.get('mainFolders', []);
    const preWorkTreeCache = WorkspaceState.get('workTreeCache', []);
    const nextWorkTreeCache = await getUpdatedWorktreeCache(repoPath, mainFolders, preWorkTreeCache);
    WorkspaceState.update('workTreeCache', nextWorkTreeCache);
};

export const updateRecentFolders = async () => {
    const list = await getRecentFolders();
    GlobalState.update('global.recentFolderCache', {
        time: +new Date(),
        list: list.map(i => i.folderUri.toString()),
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
    queueMicrotask(() => {
        const res = GlobalState.get('global.recentFolderCache', { time: -1, list: [] });
        if (+new Date() - res.time > 5000) updateRecentFolders();
    });
};
