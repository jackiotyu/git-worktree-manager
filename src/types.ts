import { Uri as URI } from 'vscode';

/* eslint-disable @typescript-eslint/naming-convention */
export interface WorkTreeDetail {
    name: string;
    path: string;
    detached: boolean;
    prunable: boolean;
    isBranch: boolean;
    locked: boolean;
    isMain: boolean;
    folderName?: string;
}

export interface WorkTreeOutputItem {
    worktree: string;
    HEAD: string;
    detached: void;
    prunable: string;
    branch?: string;
}

export interface WorkTreeCacheItem extends WorkTreeDetail {
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