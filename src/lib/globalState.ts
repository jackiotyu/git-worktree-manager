import * as vscode from 'vscode';
import { TreeItemKind, FolderItemConfig, APP_NAME } from '@/constants';
import { WorkTreeCacheItem } from '@/types';
import { globalStateEvent } from '@/lib/events';

export class GlobalState {
    static context: vscode.ExtensionContext;
    static init(context: vscode.ExtensionContext) {
        this.context = context;
        context.subscriptions.push({
            dispose: () => {
                (this.context as any) = null;
            },
        });
    }
    static get(key: 'gitFolderViewAsTree', defaultValue: boolean): boolean;
    static get(key: 'gitFolders', defaultValue: FolderItemConfig[]): FolderItemConfig[];
    static get(key: 'workTreeCache', defaultValue: WorkTreeCacheItem[]): WorkTreeCacheItem[];
    static get<T>(key: string, defaultValue: T): T {
        return this.context.globalState.get<T>(key, defaultValue);
    }

    static update(key: 'gitFolderViewAsTree', value: boolean): Thenable<void>;
    static update(key: 'gitFolders', value: FolderItemConfig[]): Thenable<void>;
    static update(key: 'workTreeCache', value: WorkTreeCacheItem[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.context.globalState.update(key, value).then(() => {
            globalStateEvent.fire();
        });
    }
}
