import { Uri as URI, TreeItem } from 'vscode';
import { ViewId } from '@/constants';

/* eslint-disable @typescript-eslint/naming-convention */
export interface IWorkTreeDetail {
    name: string;
    path: string;
    detached: boolean;
    prunable: boolean;
    isBranch: boolean;
    locked: boolean;
    isMain: boolean;
    folderName?: string;
}

export interface IWorkTreeOutputItem {
    worktree: string;
    HEAD: string;
    detached: void;
    prunable: string;
    branch?: string;
}

export interface IWorkTreeCacheItem extends IWorkTreeDetail {
    label: string;
}

export interface IRecentFolder {
	readonly folderUri: URI;
	label?: string;
	readonly remoteAuthority?: string;
}

export interface IRecentlyOpened {
	workspaces: Array<IRecentFolder>;
}

export interface ILoadMoreItem extends TreeItem {
    viewId: ViewId;
}

export interface IFolderItemConfig {
    name: string;
    path: string;
    // 默认展开
    defaultOpen?: boolean;
    // TODO 添加标签
    tags?: [];
}

export interface IRecentFolderConfig extends Pick<IFolderItemConfig, 'name' | 'path'> {
    uri: URI;
}
