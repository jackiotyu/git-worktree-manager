import * as vscode from 'vscode';
import { TreeItemKind, WORK_TREE_SCHEME } from '@/constants';
import { judgeIncludeFolder, getFolderIcon } from '@/core/util/folder';
import { getWorktreeStatus } from '@/core/util/worktree';
import { getAheadBehindCommitCount } from '@/core/git/getAheadBehindCommitCount';
import { getUpstream } from '@/core/git/getUpstream';
import { IWorktreeDetail } from '@/types';
import type { WorkspaceMainGitFolderItem } from './folder';
import type { GitFolderItem } from './gitFolder';
import { TreeViewManager } from '@/core/treeView/treeViewManager';
import { parseUpstream } from '@/core/util/ref';
import logger from '@/core/log/logger';

export class WorktreeItem extends vscode.TreeItem {
    iconPath: vscode.ThemeIcon = new vscode.ThemeIcon('folder');
    path: string = '';
    name: string = '';
    readonly type = TreeItemKind.worktree;
    upstream: string = '';
    remote?: string;
    remoteRef?: string;
    isBranch?: boolean;
    private ahead?: number;
    private behind?: number;
    private isCurrent: boolean = false;
    private updatingAheadBehind: boolean = false;

    constructor(
        private item: IWorktreeDetail,
        collapsible: vscode.TreeItemCollapsibleState,
        public parent?: GitFolderItem | WorkspaceMainGitFolderItem
    ) {
        super(WorktreeItem.generateLabel(item), collapsible);
        this.isCurrent = judgeIncludeFolder(item.path);

        this.setProperties();
        this.initUpstreamInfo();
        this.init();
    }

    init() {
        this.setDescription();
        this.setTooltip();
        this.setCommand();
        this.setIcon();
        this.setContextValue();
        this.setResourceUri();
    }

    private static generateLabel(item: IWorktreeDetail): string {
        return item.folderName ? `${item.name} ⇄ ${item.folderName}` : item.name;
    }

    private setProperties() {
        const item = this.item;
        this.id = item.path;
        this.path = item.path;
        this.name = item.name;
        this.isBranch = item.isBranch;
    }

    private setDescription() {
        let descriptionList = [];
        if (this.item.isMain) descriptionList.push('✨ ');
        if (this.ahead) descriptionList.push(`${this.ahead}↑ `);
        if (this.behind) descriptionList.push(`${this.behind}↓ `);
        descriptionList.push(this.item.path);
        this.description = descriptionList.join('');
    }

    private setCommand() {
        this.command = {
            title: 'open worktree',
            command: 'vscode.openFolder',
            arguments: [vscode.Uri.file(this.item.path), { forceNewWindow: true }],
        };
    }

    private setIcon() {
        const item = this.item;
        const isCurrent = this.isCurrent;
        const themeColor = isCurrent ? new vscode.ThemeColor('terminal.ansiBlue') : void 0;
        switch (true) {
            case this.updatingAheadBehind:
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                break;
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
    }

    private setContextValue() {
        const item = this.item;
        const lockPost = (!item.isMain && (item.locked ? '.lock' : '.unlock')) || '';
        const mainPost = item.isMain ? '.main' : '';
        const currentPost = judgeIncludeFolder(item.path) ? '.current' : '';
        const aheadPost = this.ahead ? '.ahead' : '';
        const behindPost = this.behind ? '.behind' : '';
        const fetchPost = this.upstream ? '.fetch' : '';
        const notBare = item.isBare ? '' : '.notBare';
        this.contextValue = `git-worktree-manager.worktreeItem${notBare}${mainPost}${lockPost}${currentPost}${aheadPost}${behindPost}${fetchPost}`;
    }

    private setTooltip() {
        const item = this.item;
        const isCurrent = this.isCurrent;
        const tooltip = new vscode.MarkdownString('', true);
        tooltip.appendMarkdown(vscode.l10n.t('$(folder) folder {0}\n\n', item.path));

        let sourceIcon = 'git-commit';
        let sourceName = vscode.l10n.t('commit');
        if (item.isBare) {
            sourceIcon = 'repo';
            sourceName = 'BARE';
        } else if (item.isBranch) {
            sourceIcon = 'source-control';
            sourceName = vscode.l10n.t('branch');
        } else if (item.isTag) {
            sourceIcon = 'tag';
            sourceName = vscode.l10n.t('tag');
        }
        tooltip.appendMarkdown(`$(${sourceIcon}) ${sourceName}  ${item.name}\n\n`);
        if (sourceIcon !== 'git-commit' && !item.isBare) {
            tooltip.appendMarkdown(`$(git-commit) ${vscode.l10n.t('commit')}  ${item.hash.slice(0, 8)}\n\n`);
        }
        item.prunable && tooltip.appendMarkdown(vscode.l10n.t('$(error) Detached from the git version\n\n'));
        item.locked &&
            tooltip.appendMarkdown(vscode.l10n.t('$(lock) The worktree is locked to prevent accidental purging\n\n'));
        item.isMain &&
            tooltip.appendMarkdown(vscode.l10n.t('✨ Worktree main folder, cannot be cleared and locked\n\n'));
        this.ahead && tooltip.appendMarkdown(vscode.l10n.t('$(arrow-up) Ahead commits {0}\n\n', `${this.ahead}`));
        this.behind && tooltip.appendMarkdown(vscode.l10n.t('$(arrow-down) Behind commits {0}\n\n', `${this.behind}`));
        !isCurrent && tooltip.appendMarkdown(vscode.l10n.t('*Click to open new window for this worktree*\n\n'));

        this.tooltip = tooltip;
    }

    // 手动获取ahead/behind
    private async initUpstreamInfo() {
        try {
            const item = this.item;

            if (item.isBare) return;
            if (!item.isBranch) return;

            if (this.updatingAheadBehind) return;
            this.updatingAheadBehind = true;

            this.updateView();

            await new Promise((r) => setTimeout(r, 200));
            this.upstream = await getUpstream(item.path);

            const { branch, remote } = parseUpstream(this.upstream);
            this.remote = remote;
            this.remoteRef = branch;

            const aheadBehind = await getAheadBehindCommitCount(item.name, `refs/remotes/${this.upstream}`, item.path);

            this.ahead = aheadBehind?.ahead;
            this.behind = aheadBehind?.behind;

        } catch (error) {
            logger.error(String(error));
        } finally {
            this.updatingAheadBehind = false;
            this.updateView();
        }
    }

    private updateView() {
        this.init();
        TreeViewManager.updateWorktreeView(this);
        TreeViewManager.updateGitFolderView(this);
    }

    private setResourceUri() {
        if (this.item.isBranch) {
            this.resourceUri = vscode.Uri.parse(
                `${WORK_TREE_SCHEME}://status/worktree/${getWorktreeStatus({ ahead: this.ahead, behind: this.behind })}`
            );
        }
    }
}
