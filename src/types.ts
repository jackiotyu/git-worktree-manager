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
    isBare: boolean;
    isBranch: boolean;
    isTag: boolean;
    locked: boolean;
    isMain: boolean;
    folderName?: string;
    mainFolder: string;
}

export interface AheadBehindInfo {
    ahead?: number;
    behind?: number;
}

export interface IWorktreeOutputItem {
    worktree: string;
    HEAD: string;
    detached: void;
    prunable: string;
    branch?: string;
    bare?: string;
    locked?: string;
}

export interface IWorktreeCacheItem {
    label: string;
    path: string;
    name: string;
    isMain: boolean;
    isBare: boolean;
    mainFolder: string;
}

export interface IRecentFolder {
    readonly folderUri: URI;
    label?: string;
    readonly remoteAuthority?: string;
}

export interface IBaseWorkspaceIdentifier {
    /**
     * Every workspace (multi-root, single folder or empty)
     * has a unique identifier. It is not possible to open
     * a workspace with the same `id` in multiple windows
     */
    readonly id: string;
}

/**
 * A multi-root workspace identifier is a path to a workspace file + id.
 */
export interface IWorkspaceIdentifier extends IBaseWorkspaceIdentifier {
    /**
     * Workspace config file path as `URI`.
     */
    configPath: URI;
}

export interface IRecentWorkspace {
    readonly workspace: IWorkspaceIdentifier;
    label?: string;
    readonly remoteAuthority?: string;
}

export interface IRecentCache {
    time: number;
    list: string[];
}

export enum IRecentItemType {
    workspace = 0,
    folder = 1,
}

export interface IRecentItem {
    label?: string;
    path: string;
    remoteAuthority?: string;
    type: IRecentItemType;
}

export interface IRecentItemCache {
    time: number;
    list: IRecentItem[];
}

export interface IRecentUriCache {
    time: number;
    list: vscode.Uri[];
}

export interface IRecentlyOpened {
    workspaces: Array<IRecentFolder | IRecentWorkspace>;
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

export type RefItem = Record<(typeof refArgList)[number], string>;
export type RefList = RefItem[];
export type RepoRefList = {
    branchList: RefList;
    remoteBranchList: RefList;
    tagList: RefList;
};

export interface IWorktreeLess {
    name: string;
    path: string;
}

export enum DefaultDisplayList {
    recentlyOpened = 'recentlyOpened',
    workspace = 'workspace',
    all = 'all',
}

export enum GitHistoryExtension {
    gitHistory = 'donjayamanne.githistory',
    gitGraph = 'mhutchie.git-graph',
    builtinGit = 'vscode.git',
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
        | Commands.openRepository
        | Commands.removeWorktree;
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
export type IBranchForWorktree = { branch?: string; hash?: string; mainFolder?: string };
export type BranchForWorktree = vscode.QuickPickItem & IBranchForWorktree;
export type IPickBranchResolveValue = IBranchForWorktree | void | false;
export type IPickBranchParams = {
    title: string;
    placeholder: string;
    mainFolder: string;
    cwd: string;
    step?: number;
    totalSteps?: number;
    showCreate: boolean;
};
export type IPickBranch = (params: IPickBranchParams) => Promise<IPickBranchResolveValue>;

export interface ICreateWorktreeInfo {
    folderPath: string;
    name: string;
    label: string;
    isBranch: boolean;
    cwd: string;
}
