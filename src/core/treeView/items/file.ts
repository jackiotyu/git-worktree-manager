import * as vscode from 'vscode';
import { TreeItemKind, ViewId } from '@/constants';
import { IRecentItem, IWorktreeLess } from '@/types';

export class FileItem extends vscode.TreeItem implements IWorktreeLess {
    fsPath: string = '';
    uriPath: string = '';
    readonly type = TreeItemKind.file;

    constructor(
        public name: string,
        collapsible: vscode.TreeItemCollapsibleState,
        public item: IRecentItem,
        public readonly from: ViewId,
    ) {
        super(name, collapsible);
        this.setProperties(item);
        this.setTooltip(item);
        this.setCommand(item);
    }

    private setProperties(item: IRecentItem) {
        const uri = vscode.Uri.parse(item.path);
        this.contextValue = 'git-worktree-manager.fileItem';
        this.uriPath = uri.toString();
        this.fsPath = uri.fsPath;
        this.description = uri.fsPath;
        this.iconPath = vscode.ThemeIcon.File;
        this.resourceUri = uri;
    }

    private setTooltip(item: IRecentItem) {
        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(file) file {0}\n\n', vscode.Uri.parse(item.path).fsPath));
    }

    private setCommand(item: IRecentItem) {
        this.command = {
            title: 'open file',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.parse(item.path), { forceNewWindow: true }],
        };
    }
}
