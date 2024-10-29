import * as vscode from 'vscode';
import { ViewId, TreeItemKind, QuickPickKind, Commands } from '@/constants';
import type { AllViewItem } from '@/core/treeView/items';
import type { StateKey } from '@/core/state';

export const treeDataEvent = new vscode.EventEmitter<void>();
export const updateTreeDataEvent = new vscode.EventEmitter<void | vscode.Uri>();
export const updateFolderEvent = new vscode.EventEmitter<void>();
export const globalStateEvent = new vscode.EventEmitter<StateKey>();
export const updateRecentEvent = new vscode.EventEmitter<void>();
export const toggleGitFolderViewAsEvent = new vscode.EventEmitter<boolean>();
export const loadAllTreeDataEvent = new vscode.EventEmitter<ViewId>();
export const revealTreeItemEvent = new vscode.EventEmitter<AllViewItem>();
export const worktreeChangeEvent = new vscode.EventEmitter<vscode.Uri>();
export const changeUIVisibleEvent = new vscode.EventEmitter<{ type: TreeItemKind | QuickPickKind; visible: boolean }>();

// TODO 需要精确到指定仓库
worktreeChangeEvent.event((uri) => {
    updateTreeDataEvent.fire(uri);
});

const visibleSet = new Set();
const executeWatchWorktree = () => {
    if (visibleSet.size === 0) {
        vscode.commands.executeCommand(Commands.unwatchWorktreeEvent);
    } else {
        vscode.commands.executeCommand(Commands.watchWorktreeEvent);
    }
};
changeUIVisibleEvent.event((event) => {
    if (event.visible) visibleSet.add(event.type);
    else visibleSet.delete(event.type);

    if (
        event.visible &&
        visibleSet.size === 1 &&
        (event.type === TreeItemKind.worktree || event.type === TreeItemKind.gitFolder)
    ) {
        updateTreeDataEvent.fire();
    }
    executeWatchWorktree();
});
const watchWindowState = vscode.window.onDidChangeWindowState((event) => {
    if (!event.active || !event.focused) vscode.commands.executeCommand(Commands.unwatchWorktreeEvent);
    else executeWatchWorktree();
});

export const collectEvent = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        treeDataEvent,
        updateTreeDataEvent,
        updateFolderEvent,
        globalStateEvent,
        updateRecentEvent,
        toggleGitFolderViewAsEvent,
        loadAllTreeDataEvent,
        revealTreeItemEvent,
        worktreeChangeEvent,
        changeUIVisibleEvent,
        watchWindowState
    );
};
