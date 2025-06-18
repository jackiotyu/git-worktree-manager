import * as vscode from 'vscode';
import {
    treeDataEvent,
    updateTreeDataEvent,
    collectEvent,
    globalStateEvent,
    refreshWorktreeCacheEvent,
    updateWorktreeCacheEvent,
    worktreeChangeEvent,
    updateRecentEvent,
} from '@/core/event/events';
import folderRoot from '@/core/folderRoot';
import { updateWorkspaceMainFolders, checkRecentFolderCache } from '@/core/util/cache';
import { getGitFolderByUri } from '@/core/util/folder';
import { checkRoots, updateAddDirsContext } from '@/core/util/workspace';
import { registerCommands } from '@/core/command';
import { GlobalState, WorkspaceState } from '@/core/state';
import { Alert } from '@/core/ui/message';
import { TreeViewManager } from '@/core/treeView/treeViewManager';
import { throttle, debounce } from 'lodash-es';
import logger from '@/core/log/logger';
import { WorktreeDecorator } from '@/core/util/worktree';
import { worktreeEventRegister } from '@/core/event/git';
import { Config } from '@/core/config/setting';
import { Commands, RefreshCacheType } from '@/constants';
import { updateWorkspaceListCache, updateWorktreeCache, updateRecentItems } from '@/core/util/cache';

const setupCacheEvents = (context: vscode.ExtensionContext) => {
    const updateWorktreeCacheHandler = updateWorktreeCacheEvent.event((repoPath) => {
        updateWorktreeCache(repoPath);
        updateWorkspaceListCache(repoPath);
    });
    const updateCacheHandler = refreshWorktreeCacheEvent.event(
        debounce(
            (e) => {
                if (e === RefreshCacheType.all) {
                    updateWorktreeCache();
                } else if (e === RefreshCacheType.workspace) {
                    updateWorkspaceListCache();
                }
            },
            1000,
            { leading: true },
        ),
    );
    const updateRecentCacheEvent = updateRecentEvent.event(debounce(updateRecentItems, 1000, { leading: true }));
    context.subscriptions.push(updateWorktreeCacheHandler, updateCacheHandler, updateRecentCacheEvent);
};

const setupWorkspaceEvent = (context: vscode.ExtensionContext) => {
    const worktreeChangeHandler = worktreeChangeEvent.event((uri) => {
        // 精确到指定仓库
        const repoPath = getGitFolderByUri(uri);
        updateWorktreeCacheEvent.fire(repoPath);
    });
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
    const workspaceFoldersHandler = vscode.workspace.onDidChangeWorkspaceFolders(checkRoots);
    const stateChangeHandler = globalStateEvent.event((key) => {
        if (key === 'gitFolders') {
            updateAddDirsContext();
            checkRoots();
        }
    });
    const windowStateHandler = vscode.window.onDidChangeWindowState((e) => {
        vscode.commands.executeCommand(e.focused ? Commands.watchWorktreeEvent : Commands.unwatchWorktreeEvent);
    });
    context.subscriptions.push(
        worktreeChangeHandler,
        updateHandler,
        workspaceFoldersHandler,
        stateChangeHandler,
        windowStateHandler,
    );
};

const setupEvent = (context: vscode.ExtensionContext) => {
    collectEvent(context);
    setupCacheEvents(context);
    setupWorkspaceEvent(context);
};

const setupState = (context: vscode.ExtensionContext) => {
    GlobalState.init(context);
    WorkspaceState.init(context);
    Alert.init(context);
};

const registerAllSubscriptions = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(new WorktreeDecorator()),
        folderRoot,
        logger,
        worktreeEventRegister,
        Config,
    );
};

const initializeWorkspace = () => {
    queueMicrotask(() => {
        checkRoots();
        checkRecentFolderCache();
        vscode.commands.executeCommand(Commands.watchWorktreeEvent);
    });
};

export function bootstrap(context: vscode.ExtensionContext) {
    registerAllSubscriptions(context);
    setupState(context);
    setupEvent(context);
    registerCommands(context);
    TreeViewManager.register(context);
    initializeWorkspace();
}
