import * as vscode from 'vscode';
import { IWorkTreeDetail } from '@/types';
import { ViewId } from '@/constants';
import type { AllViewItem } from '@/lib/treeView';

export const treeDataEvent = new vscode.EventEmitter<IWorkTreeDetail[]>();
export const updateTreeDataEvent = new vscode.EventEmitter<void>();
export const updateFolderEvent = new vscode.EventEmitter<void>();
export const globalStateEvent = new vscode.EventEmitter<void>();
export const updateRecentEvent = new vscode.EventEmitter<void>();
export const toggleGitFolderViewAsEvent = new vscode.EventEmitter<boolean>();
export const loadAllTreeDataEvent = new vscode.EventEmitter<ViewId>();
export const revealTreeItemEvent = new vscode.EventEmitter<AllViewItem>();
export const worktreeChangeEvent = new vscode.EventEmitter<vscode.Uri>();

// TODO 需要精确到指定仓库
worktreeChangeEvent.event(() => {
    updateTreeDataEvent.fire();
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
    );
};