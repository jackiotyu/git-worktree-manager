import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/core/event/events';
import folderRoot from '@/core/folderRoot';
import { updateWorkspaceMainFolders, updateWorkspaceListCache } from '@/core/util/cache';
import { registerCommands } from '@/core/command';
import { GlobalState, WorkspaceState } from '@/core/state';
import { Alert } from '@/core/ui/message';
import { TreeViewManager } from '@/core/treeView/views';
import throttle from 'lodash/throttle';
import logger from '@/core/log/logger';
import { WorktreeDecorator } from '@/core/util/worktree';
import { worktreeEventRegister } from '@/core/event/git';

export function activate(context: vscode.ExtensionContext) {
    logger.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    WorkspaceState.init(context);
    Alert.init(context);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    vscode.window.registerFileDecorationProvider(new WorktreeDecorator());
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
    registerCommands(context);
    TreeViewManager.register(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, updateHandler, logger, worktreeEventRegister, workspaceFoldersChangeEvent);
}

export function deactivate() {}
