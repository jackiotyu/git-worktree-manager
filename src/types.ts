import { Uri as URI, TreeItem } from 'vscode';
import { ViewId } from '@/constants';

/* eslint-disable @typescript-eslint/naming-convention */
export interface IWorkTreeDetail {
    name: string;
    path: string;
    hash: string;
    detached: boolean;
    prunable: boolean;
    isBranch: boolean;
    isTag: boolean;
    locked: boolean;
    isMain: boolean;
    folderName?: string;
    ahead?: number;
    behind?: number;
    remoteRef?: string;
    remote?: string;
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

export interface IWorktreeLess {
    name: string;
    path: string;
}

export enum DefaultDisplayList {
    workspace = 'workspace',
    all = 'all',
}

export enum GitHistoryExtension {
    gitHistory = 'donjayamanne.githistory',
    gitGraph = 'mhutchie.git-graph',
}