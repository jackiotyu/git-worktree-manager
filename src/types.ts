import { Uri as URI, TreeItem } from 'vscode';
import { Commands, ViewId, refArgList } from '@/constants';
import * as vscode from 'vscode';

/* eslint-disable @typescript-eslint/naming-convention */
export interface IWorktreeDetail {
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

export interface IWorktreeOutputItem {
    worktree: string;
    HEAD: string;
    detached: void;
    prunable: string;
    branch?: string;
}

export interface IWorktreeCacheItem extends IWorktreeDetail {
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

type RepoPath = string;
export type RefItem = Record<(typeof refArgList)[number], string>;
export type RefList = RefItem[];
export type RepoRefList = {
    branchList: RefList;
    remoteBranchList: RefList;
    tagList: RefList;
};
export type IRepoRefMap = Record<RepoPath, RepoRefList>;

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

export interface QuickPickAction extends vscode.QuickPickItem {
    action:
        | 'copy'
        | Commands.openTerminal
        | Commands.openExternalTerminalContext
        | Commands.revealInSystemExplorerContext
        | Commands.addToWorkspace
        | Commands.removeFromWorkspace
        | Commands.viewHistory
        | Commands.openRepository;
    hide?: boolean;
}

export type PullPushArgs = {
    remote: string;
    branch: string;
    remoteRef: string;
    cwd: string;
};

export type FetchArgs = {
    remote: string;
    remoteRef: string;
    cwd: string;
};

export interface BranchForWorktree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}
export type IPickBranchResolveValue = BranchForWorktree | void | false;
export type IPickBranch = (
    title: string,
    placeholder: string,
    mainFolder: string,
    cwd: string,
) => Promise<IPickBranchResolveValue>;
