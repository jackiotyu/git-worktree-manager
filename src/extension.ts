import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/lib/events';
import folderRoot from '@/lib/folderRoot';
import { updateWorkspaceMainFolders, updateWorkspaceListCache } from '@/utils';
import { CommandsManger } from '@/lib/commands';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import { Alert } from '@/lib/adaptor/window';
import { TreeViewManager } from '@/lib/treeView';
import throttle from 'lodash/throttle';
import logger from '@/lib/logger';
import { WorkTreeDecorator } from '@/lib/fileDecorator';
import { worktreeEventRegister } from '@/lib/gitEvent';

export function activate(context: vscode.ExtensionContext) {
    logger.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    WorkspaceState.init(context);
    Alert.init(context);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    vscode.window.registerFileDecorationProvider(new WorkTreeDecorator());
    const updateHandler = updateTreeDataEvent.event(
        throttle(async () => {
            await updateWorkspaceMainFolders();
            treeDataEvent.fire();
        }, 1000, { trailing: true, leading: true }),
    );
    const workspaceFoldersChangeEvent = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        await new Promise(resolve => process.nextTick(resolve));
        await updateWorkspaceMainFolders();
        await updateWorkspaceListCache();
        treeDataEvent.fire();
    });
    CommandsManger.register(context);
    TreeViewManager.register(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, updateHandler, logger, worktreeEventRegister, workspaceFoldersChangeEvent);
}

export function deactivate() {}
