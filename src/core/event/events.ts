import * as vscode from 'vscode';
import { ViewId, RefreshCacheType } from '@/constants';
import type { AllViewItem } from '@/core/treeView/items';
import type { StateKey } from '@/core/state';

export const refreshWorktreeCacheEvent = new vscode.EventEmitter<RefreshCacheType>();
export const updateWorktreeCacheEvent = new vscode.EventEmitter<string>();
export const treeDataEvent = new vscode.EventEmitter<void>();
export const updateTreeDataEvent = new vscode.EventEmitter<void | vscode.Uri>();
export const updateFolderEvent = new vscode.EventEmitter<void>();
export const globalStateEvent = new vscode.EventEmitter<StateKey>();
export const workspaceStateEvent = new vscode.EventEmitter<StateKey>();
export const updateRecentEvent = new vscode.EventEmitter<void>();
export const updateFavoriteEvent = new vscode.EventEmitter<void>();
export const toggleGitFolderViewAsEvent = new vscode.EventEmitter<boolean>();
export const loadAllTreeDataEvent = new vscode.EventEmitter<ViewId>();
export const revealTreeItemEvent = new vscode.EventEmitter<AllViewItem>();
export const worktreeChangeEvent = new vscode.EventEmitter<vscode.Uri>();

export const collectEvent = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        refreshWorktreeCacheEvent,
        updateWorktreeCacheEvent,
        treeDataEvent,
        updateTreeDataEvent,
        updateFolderEvent,
        globalStateEvent,
        workspaceStateEvent,
        updateRecentEvent,
        updateFavoriteEvent,
        toggleGitFolderViewAsEvent,
        loadAllTreeDataEvent,
        revealTreeItemEvent,
        worktreeChangeEvent,
    );
};
