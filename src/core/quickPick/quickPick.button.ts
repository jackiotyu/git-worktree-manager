import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';

export const backButton = vscode.QuickInputButtons.Back;

interface IQuickInputButton extends vscode.QuickInputButton {
    enabled: boolean;
}

abstract class QuickInputButton implements IQuickInputButton {
    abstract enabled: boolean;
    readonly defaultValue?: boolean;
    abstract iconPath: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    readonly configKey?: string;
    constructor() {
        queueMicrotask(() => {
            this.configKey &&
                Config.onChange(this.configKey, () => {
                    this.enabled = Config.get(this.configKey as any, this.defaultValue as any) as unknown as boolean;
                });
        });
    }
}

export const openInNewWindowQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('arrow-right');
    tooltip = vscode.l10n.t('Switch the current window to this folder.');
    enabled = true;
})();
export const revealInSystemExplorerQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('folder-opened');
    tooltip = vscode.l10n.t('Reveal in the system explorer');
    readonly configKey = 'worktreePick.showRevealInSystemExplorer';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const openExternalTerminalQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('terminal-bash');
    tooltip = vscode.l10n.t('Open in External Terminal');
    readonly configKey = 'worktreePick.showExternalTerminal';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const openTerminalQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('terminal');
    tooltip = vscode.l10n.t('Open in VSCode built-in Terminal');
    readonly configKey = 'worktreePick.showTerminal';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const addToWorkspaceQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('multiple-windows');
    tooltip = vscode.l10n.t('Add folder to workspace');
    readonly configKey = 'worktreePick.showAddToWorkspace';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const removeFromWorkspaceQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('close');
    tooltip = vscode.l10n.t('Remove folder from workspace');
    readonly configKey = 'worktreePick.showAddToWorkspace';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const sortByBranchQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('case-sensitive');
    tooltip = vscode.l10n.t('Sort by branch name');
    enabled = true;
})();
export const sortByRepoQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('list-flat');
    tooltip = vscode.l10n.t('Sort by repository');
    enabled = true;
})();
export const settingQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('gear');
    tooltip = vscode.l10n.t('Settings');
    enabled = true;
})();
export const addGitRepoQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('add');
    tooltip = vscode.l10n.t('Add a git repository folder path');
    enabled = true;
})();
export const copyItemQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('copy');
    tooltip = vscode.l10n.t('Copy');
    readonly configKey = 'worktreePick.showCopy';
    readonly defaultValue = false;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const useAllWorktreeQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('list-tree');
    tooltip = vscode.l10n.t('Click to display worktree list in all workspaces');
    enabled = true;
})();
export const useWorkspaceWorktreeQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('folder-library');
    tooltip = vscode.l10n.t('Click to display worktree list in workspace');
    enabled = true;
})();
export const checkoutBranchQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('source-control');
    tooltip = vscode.l10n.t('Checkout');
    readonly configKey = 'worktreePick.showCheckout';
    readonly defaultValue = true;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const addWorktreeQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('new-folder');
    tooltip = vscode.l10n.t('Create Worktree');
    enabled = true;
})();
export const moreQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('three-bars');
    tooltip = vscode.l10n.t('More actions...');
    enabled = true;
})();
export const viewHistoryQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('history');
    tooltip = vscode.l10n.t('View git history');
    readonly configKey = 'worktreePick.showViewHistory';
    readonly defaultValue = true;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const openRepositoryQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('repo');
    tooltip = vscode.l10n.t('Open the repository in Source Control view');
    readonly configKey = 'worktreePick.showOpenRepository';
    readonly defaultValue = true;
    enabled = Config.get(this.configKey, this.defaultValue);
})();
export const openRecentlyQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('arrow-swap');
    tooltip = vscode.l10n.t('Open recently used folders');
    enabled = true;
})();
export const backWorkspaceQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('arrow-swap');
    tooltip = vscode.l10n.t('Open worktree list');
    enabled = true;
})();
export const refreshRecentlyQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('refresh');
    tooltip = vscode.l10n.t('Refresh');
    enabled = true;
})();
export const saveRepoQuickInputButton: IQuickInputButton = new (class extends QuickInputButton {
    iconPath = new vscode.ThemeIcon('star-empty');
    tooltip = vscode.l10n.t('Save git repository');
    enabled = true;
})();
