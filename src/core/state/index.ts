import * as vscode from 'vscode';
import { IFolderItemConfig, IWorktreeCacheItem, RepoRefList } from '@/types';
import { globalStateEvent } from '@/core/event/events';

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
    static get(key: `global.gitRepo.refList.${string}`, defaultValue: RepoRefList): RepoRefList;
    static get(key: 'gitFolderViewAsTree', defaultValue: boolean): boolean;
    static get(key: 'gitFolders', defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get(key: 'workTreeCache', defaultValue: IWorktreeCacheItem[]): IWorktreeCacheItem[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }

    static update(key: `global.gitRepo.refList.${string}`, value: RepoRefList): Thenable<void>;
    static update(key: 'gitFolderViewAsTree', value: boolean): Thenable<void>;
    static update(key: 'gitFolders', value: IFolderItemConfig[]): Thenable<void>;
    static update(key: 'workTreeCache', value: IWorktreeCacheItem[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.state.update(key, value).then(() => {
            globalStateEvent.fire();
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
    static get(key: 'workTreeCache', defaultValue: IWorktreeCacheItem[]): IWorktreeCacheItem[];
    static get(key: 'mainFolders', defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }
    static update(key: 'workTreeCache', value: IWorktreeCacheItem[]): Thenable<void>;
    static update(key: 'mainFolders', value: IFolderItemConfig[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.state.update(key, value).then(() => {
            globalStateEvent.fire();
        });
    }
}
