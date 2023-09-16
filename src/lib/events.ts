import * as vscode from 'vscode';
import { WorkTreeDetail } from '@/types';

export const treeDataEvent = new vscode.EventEmitter<WorkTreeDetail[]>();
export const updateTreeDataEvent = new vscode.EventEmitter<void>();
export const updateFolderEvent = new vscode.EventEmitter<void>();
export const globalStateEvent = new vscode.EventEmitter<void>();
export const updateRecentEvent = new vscode.EventEmitter<void>();
export const toggleGitFolderViewAsEvent = new vscode.EventEmitter<boolean>();

export const collectEvent = (context: vscode.ExtensionContext) => {
    context.subscriptions.push(
        treeDataEvent,
        updateTreeDataEvent,
        updateFolderEvent,
        globalStateEvent,
        updateRecentEvent,
        toggleGitFolderViewAsEvent,
    );
};