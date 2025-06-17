import * as vscode from 'vscode';
import { IFolderItemConfig, IWorktreeCacheItem, RepoRefList, IRecentItemCache, IRecentItem } from '@/types';
import { globalStateEvent } from '@/core/event/events';

type KeyGitRepoRefList = `global.gitRepo.refList.${string}`;
type KeyGitFolderViewAsTree = 'gitFolderViewAsTree';
type KeyGitFolders = 'gitFolders';
type KeyWorkTreeCache = 'workTreeCache';
type KeyMainFolders = 'mainFolders';
type KeyGlobalRecentItemCache = 'global.recentItemCache';
type KeyGlobalFavorite = 'global.favorite';

export type StateKey = KeyGitRepoRefList | KeyGitFolderViewAsTree | KeyGitFolders | KeyWorkTreeCache | KeyMainFolders | KeyGlobalRecentItemCache | KeyGlobalFavorite;

export class GlobalState {
    static context: vscode.ExtensionContext;
    static state: vscode.Memento;
    static init(context: vscode.ExtensionContext) {
        this.context = context;
        this.state = context.globalState;
        context.subscriptions.push({
            dispose: () => {
                (this.context as any) = null;
                (this.state as any) = null;
            },
        });
    }
    static get(key: KeyGlobalRecentItemCache, defaultValue: IRecentItemCache): IRecentItemCache;
    static get(key: KeyGitRepoRefList, defaultValue: RepoRefList): RepoRefList;
    static get(key: KeyGitFolderViewAsTree, defaultValue: boolean): boolean;
    static get(key: KeyGitFolders, defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get(key: KeyWorkTreeCache, defaultValue: IWorktreeCacheItem[]): IWorktreeCacheItem[];
    static get(key: KeyGlobalFavorite, defaultValue: IRecentItem[]): IRecentItem[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }

    static update(key: KeyGlobalRecentItemCache, defaultValue: IRecentItemCache): Thenable<void>;
    static update(key: KeyGitRepoRefList, value: RepoRefList): Thenable<void>;
    static update(key: KeyGitFolderViewAsTree, value: boolean): Thenable<void>;
    static update(key: KeyGitFolders, value: IFolderItemConfig[]): Thenable<void>;
    static update(key: KeyWorkTreeCache, value: IWorktreeCacheItem[]): Thenable<void>;
    static update(key: KeyGlobalFavorite, value: IRecentItem[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.state.update(key, value).then(() => {
            globalStateEvent.fire(key as KeyGitRepoRefList);
        });
    }
}

export class WorkspaceState {
    static context: vscode.ExtensionContext;
    static state: vscode.Memento;
    static init(context: vscode.ExtensionContext) {
        this.context = context;
        this.state = context.workspaceState;
        context.subscriptions.push({
            dispose: () => {
                (this.context as any) = null;
                (this.state as any) = null;
            },
        });
    }
    static get(key: KeyWorkTreeCache, defaultValue: IRecentItem[]): IWorktreeCacheItem[];
    static get(key: KeyMainFolders, defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }
    static update(key: KeyWorkTreeCache, value: IWorktreeCacheItem[]): Thenable<void>;
    static update(key: KeyMainFolders, value: IFolderItemConfig[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.state.update(key, value).then(() => {
            globalStateEvent.fire(key as KeyGitRepoRefList);
        });
    }
}
