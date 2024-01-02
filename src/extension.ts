import * as vscode from 'vscode';
import { treeDataEvent, updateTreeDataEvent, collectEvent } from '@/lib/events';
import folderRoot from '@/lib/folderRoot';
import { getWorkTreeList } from '@/utils';
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
    // TODO 手动打开监听
    GlobalState.get('gitFolders', []).forEach((config) => {
        worktreeEventRegister.add(vscode.Uri.file(config.path));
    });
    Alert.init(context);
    vscode.commands.executeCommand('setContext', 'git-worktree-manager.locale', vscode.env.language.toLowerCase());
    vscode.window.registerFileDecorationProvider(new WorkTreeDecorator());
    const updateHandler = updateTreeDataEvent.event(
        throttle(async () => treeDataEvent.fire((await getWorkTreeList())), 1000, { trailing: true, leading: true }),
    );
    CommandsManger.register(context);
    TreeViewManager.register(context);
    collectEvent(context);
    context.subscriptions.push(folderRoot, updateHandler, logger, worktreeEventRegister);
}

export function deactivate() {}
