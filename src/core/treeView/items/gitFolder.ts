import * as vscode from 'vscode';
import { TreeItemKind } from '@/constants';
import { IFolderItemConfig } from '@/types';

export class GitFolderItem extends vscode.TreeItem {
    readonly type = TreeItemKind.gitFolder;
    name: string;
    path: string;
    defaultOpen?: boolean = false;
    readonly parent = void 0;
    constructor(item: IFolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.id = `${item.name} ~~ ${item.path}`;
        this.name = item.name;
        this.path = item.path;
        this.defaultOpen = !!item.defaultOpen;
        this.iconPath = new vscode.ThemeIcon('repo');
        this.contextValue = `git-worktree-manager.gitFolderItem.${this.defaultOpen ? 'defaultOpen' : 'defaultClose'}`;
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
    }
}
