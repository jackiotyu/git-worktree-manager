import * as vscode from 'vscode';
import { TreeItemKind } from '@/constants';
import { IFolderItemConfig, IWorktreeLess } from '@/types';

export class GitFolderItem extends vscode.TreeItem implements IWorktreeLess {
    readonly type = TreeItemKind.gitFolder;
    name: string = '';
    fsPath: string = '';
    uriPath: string = '';
    defaultOpen?: boolean = false;
    readonly parent = void 0;

    constructor(item: IFolderItemConfig, collapsible: vscode.TreeItemCollapsibleState) {
        super(item.name, collapsible);
        this.setProperties(item);
        this.setTooltip(item);
    }

    private setProperties(item: IFolderItemConfig) {
        this.id = `${item.name} ~~ ${item.path}`;
        this.name = item.name;
        const uri = vscode.Uri.file(item.path);
        this.uriPath = uri.toString();
        this.fsPath = uri.fsPath;
        this.defaultOpen = !!item.defaultOpen;
        this.iconPath = new vscode.ThemeIcon('repo');
        this.contextValue = `git-worktree-manager.gitFolderItem.${this.defaultOpen ? 'defaultOpen' : 'defaultClose'}`;
    }

    private setTooltip(item: IFolderItemConfig) {
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
    }
}
