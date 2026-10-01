import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';
import type { WorktreeSortOrder } from '@/core/util/worktreeSort';

export function sortWorktreesCmd(order: WorktreeSortOrder): Thenable<void> {
    return Config.update('treeView.worktreeSortOrder', order, vscode.ConfigurationTarget.Global);
}
