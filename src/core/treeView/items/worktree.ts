import * as vscode from 'vscode';
import { TreeItemKind, WORK_TREE_SCHEME } from '@/constants';
import { judgeIncludeFolder, getFolderIcon } from '@/core/util/folder';
import { getWorktreeStatus } from '@/core/util/worktree';
import { IWorkTreeDetail } from '@/types';
import type { WorkspaceMainGitFolderItem } from './folder';
import type { GitFolderItem } from './gitFolder';

export class WorkTreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon;
    path: string;
    name: string;
    readonly type = TreeItemKind.worktree;
    parent?: GitFolderItem | WorkspaceMainGitFolderItem;
    remoteRef?: string;
    remote?: string;
    isBranch?: boolean;
    constructor(
        item: IWorkTreeDetail,
        collapsible: vscode.TreeItemCollapsibleState,
        parent?: GitFolderItem | WorkspaceMainGitFolderItem,
    ) {
        let finalName = item.folderName ? `${item.name} ⇄ ${item.folderName}` : item.name;
        super(finalName, collapsible);
        this.description = `${item.isMain ? '✨ ' : ''}${item.ahead ? `${item.ahead}↑ ` : ''}${
            item.behind ? `${item.behind}↓ ` : ''
        }${item.path}`;
        this.parent = parent;
        this.id = item.path;

        const isCurrent = judgeIncludeFolder(item.path);
        const themeColor = isCurrent ? new vscode.ThemeColor('statusBarItem.remoteBackground') : void 0;

        switch (true) {
            case item.prunable:
                this.iconPath = new vscode.ThemeIcon('error', themeColor);
                break;
            case item.locked:
                this.iconPath = new vscode.ThemeIcon('lock', themeColor);
                break;
            default:
                this.iconPath = getFolderIcon(item.path, themeColor);
                break;
        }
        let lockPost = (!item.isMain && (item.locked ? '.lock' : '.unlock')) || '';
        let mainPost = item.isMain ? '.main' : '';
        let currentPost = isCurrent ? '.current' : '';
        let aheadPost = item.ahead ? '.ahead' : '';
        let behindPost = item.behind ? '.behind' : '';
        let fetchPost = item.remote && item.remoteRef ? '.fetch' : '';
        this.contextValue = `git-worktree-manager.worktreeItem${mainPost}${lockPost}${currentPost}${aheadPost}${behindPost}${fetchPost}`;

        this.path = item.path;
        this.name = item.name;
        this.remoteRef = item.remoteRef;
        this.remote = item.remote;
        this.isBranch = item.isBranch;

        this.tooltip = new vscode.MarkdownString('', true);
        this.tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));
        let sourceIcon = 'git-commit';
        let sourceName = vscode.l10n.t('commit');
        if (item.isBranch) {
            sourceIcon = 'source-control';
            sourceName = vscode.l10n.t('branch');
        } else if (item.isTag) {
            sourceIcon = 'tag';
            sourceName = vscode.l10n.t('tag');
        }
        this.tooltip.appendMarkdown(`$(${sourceIcon}) ${sourceName}  ${item.name}\n\n`);
        sourceIcon !== 'git-commit' &&
            this.tooltip.appendMarkdown(`$(git-commit) ${vscode.l10n.t('commit')}  ${item.hash.slice(0, 8)}\n\n`);
        item.prunable && this.tooltip.appendMarkdown(vscode.l10n.t('$(error) Detached from the git version\n\n'));
        item.locked && this.tooltip.appendMarkdown(vscode.l10n.t('$(lock) The worktree is locked to prevent accidental purging\n\n'));
        item.isMain && this.tooltip.appendMarkdown(vscode.l10n.t('✨ Worktree main folder, cannot be cleared and locked\n\n'));
        item.ahead && this.tooltip.appendMarkdown(vscode.l10n.t('$(arrow-up) Ahead commits {0}\n\n', `${item.ahead}`));
        item.behind && this.tooltip.appendMarkdown(vscode.l10n.t('$(arrow-down) Behind commits {0}\n\n', `${item.behind}`));
        !isCurrent && this.tooltip.appendMarkdown(vscode.l10n.t('*Click to open new window for this worktree*\n\n'));

        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(item.path), { forceNewWindow: true }],
        };

        if(item.isBranch) {
            this.resourceUri = vscode.Uri.parse(`${WORK_TREE_SCHEME}://status/worktree/${getWorktreeStatus(item)}`);
        }
    }
}
