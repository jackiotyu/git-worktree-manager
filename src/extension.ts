import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent, globalStateEvent } from '@/core/event/events';
import folderRoot from '@/core/folderRoot';
import { updateWorkspaceMainFolders, checkRecentFolderCache } from '@/core/util/cache';
import { checkRoots, updateAddDirsContext } from '@/core/util/workspace';
import { registerCommands } from '@/core/command';
import { GlobalState, WorkspaceState } from '@/core/state';
import { Alert } from '@/core/ui/message';
import { TreeViewManager } from '@/core/treeView/treeViewManager';
import throttle from 'lodash/throttle';
import logger from '@/core/log/logger';
import { WorktreeDecorator } from '@/core/util/worktree';
import { worktreeEventRegister } from '@/core/event/git';
import { Config } from '@/core/config/setting';

export function activate(context: vscode.ExtensionContext) {
    logger.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    WorkspaceState.init(context);
    Alert.init(context);
    vscode.window.registerFileDecorationProvider(new WorktreeDecorator());
    const updateHandler = updateTreeDataEvent.event(
        throttle(
            async () => {
                await updateWorkspaceMainFolders();
                treeDataEvent.fire();
            },
            1000,
            { trailing: true, leading: true },
        ),
    );
    const workspaceFoldersChangeEvent = vscode.workspace.onDidChangeWorkspaceFolders(checkRoots);
    queueMicrotask(checkRoots);
    registerCommands(context);
    TreeViewManager.register(context);
    collectEvent(context);
    const stateChangeEvent = globalStateEvent.event((key) => {
        if (key === 'gitFolders') updateAddDirsContext();
    });
    checkRecentFolderCache();
    context.subscriptions.push(
        folderRoot,
        updateHandler,
        logger,
        worktreeEventRegister,
        workspaceFoldersChangeEvent,
        stateChangeEvent,
        Config,
    );
}

export function deactivate() {}
