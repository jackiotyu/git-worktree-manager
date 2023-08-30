import * as vscode from 'vscode';
import { TreeItemKind, FolderItemConfig, APP_NAME } from '@/constants';
import { globalStateEvent } from '@/lib/events';

interface Thenable<T> {
    then<TResult>(
        onfulfilled?: (value: T) => TResult | Thenable<TResult>,
        onrejected?: (reason: any) => TResult | Thenable<TResult>,
    ): Thenable<TResult>;
    then<TResult>(
        onfulfilled?: (value: T) => TResult | Thenable<TResult>,
        onrejected?: (reason: any) => void,
    ): Thenable<TResult>;
}

export class GlobalState {
    static context: vscode.ExtensionContext;
    static init(context: vscode.ExtensionContext) {
        this.context = context;

        // FIXME 兼容旧数据
        if (this.get('gitFolders', []).length === 0 && vscode.workspace.getConfiguration(APP_NAME).has('gitFolders')) {
            let data = vscode.workspace.getConfiguration(APP_NAME).get<FolderItemConfig[]>('gitFolders');
            if (data && data.length) {
                this.update('gitFolders', data);
            }
        }

        context.subscriptions.push({
            dispose: () => {
                (this.context as any) = null;
            },
        });
    }

    static get(key: 'gitFolders', defaultValue: FolderItemConfig[]): FolderItemConfig[];
    static get<T>(key: string, defaultValue: T): T {
        return this.context.globalState.get<T>(key, defaultValue);
    }

    static update(key: 'gitFolders', value: FolderItemConfig[]): Thenable<void>;
    static update(key: string, value: any): Thenable<void> {
        return this.context.globalState.update(key, value).then(() => {
            globalStateEvent.fire();
        });
    }
}
