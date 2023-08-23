import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent } from './events';
import { WorkTreeDataProvider } from './treeView';
import folderRoot from './folderRoot';
import { getWorkTreeList } from './utils';
import { CommandsManger } from './commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('git-worktree-manager is now active!');
    const updateHandler = updateTreeDataEvent.event(() => {
        treeDataEvent.fire(getWorkTreeList());
    });
    CommandsManger.register(context);
    const treeData = new WorkTreeDataProvider(context);
    context.subscriptions.push(
        folderRoot,
        vscode.window.registerTreeDataProvider(WorkTreeDataProvider.id, treeData),
        updateHandler,
    );
}

export function deactivate() {}
