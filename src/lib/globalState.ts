import * as vscode from 'vscode';
import { IFolderItemConfig, IWorkTreeCacheItem } from '@/types';
import { globalStateEvent } from '@/lib/events';

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
    static get(key: 'gitFolderViewAsTree', defaultValue: boolean): boolean;
    static get(key: 'gitFolders', defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get(key: 'workTreeCache', defaultValue: IWorkTreeCacheItem[]): IWorkTreeCacheItem[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }

    static update(key: 'gitFolderViewAsTree', value: boolean): Thenable<void>;
    static update(key: 'gitFolders', value: IFolderItemConfig[]): Thenable<void>;
    static update(key: 'workTreeCache', value: IWorkTreeCacheItem[]): Thenable<void>;
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
    static get(key: 'workTreeCache', defaultValue: IWorkTreeCacheItem[]): IWorkTreeCacheItem[];
    static get(key: 'mainFolders', defaultValue: IFolderItemConfig[]): IFolderItemConfig[];
    static get<T>(key: string, defaultValue: T): T {
        return this.state.get<T>(key, defaultValue);
    }
    static update(key: 'workTreeCache', value: IWorkTreeCacheItem[]): Thenable<void>;
    static update(key: 'mainFolders', value: IFolderItemConfig[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.state.update(key, value).then(() => {
            globalStateEvent.fire();
        });
    }
}
