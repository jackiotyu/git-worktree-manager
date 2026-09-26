import * as vscode from 'vscode';
import { TreeItemKind } from '@/constants';
import { IWorktreeGroup } from '@/types';
import type { WorkspaceMainGitFolderItem } from './folder';
import type { WorktreeItem } from './worktree';

export class WorktreeGroupItem extends vscode.TreeItem {
    readonly type = TreeItemKind.worktreeGroup;
    readonly groupId: string;
    readonly repositoryPath: string;
    name: string;
    children: WorktreeItem[] = [];

    constructor(
        group: IWorktreeGroup,
        public parent?: WorkspaceMainGitFolderItem,
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Expanded);
        this.groupId = group.id;
        this.repositoryPath = group.repositoryPath;
        this.name = group.name;
        this.id = `worktree-group:${group.id}`;
        this.iconPath = new vscode.ThemeIcon('folder-library');
        this.contextValue = 'git-worktree-manager.worktreeGroupItem';
        this.tooltip = vscode.l10n.t('Worktree group {0}', group.name);
    }
}
