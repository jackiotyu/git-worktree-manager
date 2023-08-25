import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/lib/events';
import { WorkTreeDataProvider, GitFoldersDataProvider } from '@/lib/treeView';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
import { CommandsManger } from '@/lib/commands';
import { init } from 'vscode-nls-i18n';
import { setupGitEvents } from '@/lib/gitExtension';

export function activate(context: vscode.ExtensionContext) {
    console.log('git-worktree-manager is now active!');
    init(context.extensionPath);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    const updateHandler = updateTreeDataEvent.event(() => {
        treeDataEvent.fire(getWorkTreeList());
    });
    CommandsManger.register(context);
    const treeData = new WorkTreeDataProvider(context);
    const folderData = new GitFoldersDataProvider(context);
    setupGitEvents(treeData, context);
    collectEvent(context);
    context.subscriptions.push(
        folderRoot,
        vscode.window.registerTreeDataProvider(WorkTreeDataProvider.id, treeData),
        updateHandler,
        vscode.window.registerTreeDataProvider(GitFoldersDataProvider.id, folderData),
    );
}

export function deactivate() {}
