import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/lib/events';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
import { CommandsManger } from '@/lib/commands';
import { setupGitEvents } from '@/lib/gitExtension';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import { Alert } from '@/lib/adaptor/window';
import { TreeViewManager } from '@/lib/treeView';
import throttle from 'lodash/throttle';
import logger from '@/lib/logger';
import { WorkTreeDecorator } from '@/lib/fileDecorator';

export function activate(context: vscode.ExtensionContext) {
    logger.log('git-worktree-manager is now active!');
    GlobalState.init(context);
    WorkspaceState.init(context);
    Alert.init(context);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    vscode.window.registerFileDecorationProvider(new WorkTreeDecorator());
    const updateHandler = updateTreeDataEvent.event(
        throttle(async () => treeDataEvent.fire((await getWorkTreeList())), 1000, { trailing: true, leading: true }),
    );
    CommandsManger.register(context);
    TreeViewManager.register(context);
    setupGitEvents(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, updateHandler, logger);
}

export function deactivate() {}
