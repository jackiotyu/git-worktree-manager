import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent } from '@/lib/events';
import { WorkTreeDataProvider, GitFoldersDataProvider } from '@/lib/treeView';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
import { CommandsManger } from '@/lib/commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('git-worktree-manager is now active!');
    const updateHandler = updateTreeDataEvent.event(() => {
        treeDataEvent.fire(getWorkTreeList());
    });
    CommandsManger.register(context);
    const treeData = new WorkTreeDataProvider(context);
    const folderData = new GitFoldersDataProvider(context);
    context.subscriptions.push(
        folderRoot,
        vscode.window.registerTreeDataProvider(WorkTreeDataProvider.id, treeData),
        updateHandler,
        vscode.window.registerTreeDataProvider(GitFoldersDataProvider.id, folderData),
        updateTreeDataEvent,
        treeDataEvent,
    );
}

export function deactivate() {}
