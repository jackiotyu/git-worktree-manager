import * as vscode from 'vscode';
import { Config } from '@/core/config/setting';

export const backButton = vscode.QuickInputButtons.Back;

interface IQuickInputButton extends vscode.QuickInputButton {
    enabled: boolean;
}

interface IOptions {
    iconPath: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    tooltip: string;
    enabled?: boolean;
    configKey?: string;
    defaultValue?: boolean;
}

class QuickInputButton implements IQuickInputButton {
    public enabled: boolean = true;
    public iconPath: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    public tooltip: string;
    private readonly configKey?: string;
    private defaultValue?: boolean;
    constructor(options: IOptions) {
        this.iconPath = options.iconPath;
        this.tooltip = options.tooltip;
        this.configKey = options.configKey;
        this.defaultValue = options.defaultValue;
        if (typeof options.enabled === 'boolean') {
            this.enabled = options.enabled;
        }
        if (typeof this.configKey === 'string') {
            this.initEnabled();
            queueMicrotask(() => {
                this.configKey && Config.onChange(this.configKey, this.initEnabled);
            });
        }
    }
    private initEnabled = () => {
        this.enabled = Config.get(this.configKey as any, this.defaultValue as any) as unknown as boolean;
    };
}

export const openInNewWindowQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('arrow-right'),
    tooltip: vscode.l10n.t('Switch the current window to this folder.'),
});
export const revealInSystemExplorerQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('folder-opened'),
    tooltip: vscode.l10n.t('Reveal in the system explorer'),
    configKey: 'worktreePick.showRevealInSystemExplorer',
    defaultValue: false,
});
export const openExternalTerminalQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('terminal-bash'),
    tooltip: vscode.l10n.t('Open in External Terminal'),
    configKey: 'worktreePick.showExternalTerminal',
    defaultValue: false,
});
export const openTerminalQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('terminal'),
    tooltip: vscode.l10n.t('Open in Built-in Terminal'),
    configKey: 'worktreePick.showTerminal',
    defaultValue: false,
});
export const addToWorkspaceQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('multiple-windows'),
    tooltip: vscode.l10n.t('Add folder to workspace'),
    configKey: 'worktreePick.showAddToWorkspace',
    defaultValue: false,
});
export const removeFromWorkspaceQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: vscode.l10n.t('Remove folder from workspace'),
    configKey: 'worktreePick.showAddToWorkspace',
    defaultValue: false,
});
export const sortByBranchQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('case-sensitive'),
    tooltip: vscode.l10n.t('Sort by branch name'),
});
export const sortByRepoQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('list-flat'),
    tooltip: vscode.l10n.t('Sort by repository'),
});
export const settingQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('gear'),
    tooltip: vscode.l10n.t('Open Settings'),
});
export const addGitRepoQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('add'),
    tooltip: vscode.l10n.t('Add a git repository folder path'),
});
export const copyItemQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('copy'),
    tooltip: vscode.l10n.t('Copy'),
    configKey: 'worktreePick.showCopy',
    defaultValue: false,
});
export const useAllWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('pass'),
    tooltip: vscode.l10n.t('Click to display all worktree list'),
});
export const useWorkspaceWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('pass-filled'),
    tooltip: vscode.l10n.t('Click to display worktree list in workspace'),
});
export const checkoutBranchQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('source-control'),
    tooltip: vscode.l10n.t('Checkout'),
    configKey: 'worktreePick.showCheckout',
    defaultValue: true,
});
export const addWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('new-folder'),
    tooltip: vscode.l10n.t('Create Worktree'),
});
export const moreQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('three-bars'),
    tooltip: vscode.l10n.t('More actions...'),
});
export const viewHistoryQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('history'),
    tooltip: vscode.l10n.t('View git history'),
    configKey: 'worktreePick.showViewHistory',
    defaultValue: true,
});
export const openRepositoryQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('repo'),
    tooltip: vscode.l10n.t('Open the repository in Source Control view'),
    configKey: 'worktreePick.showOpenRepository',
    defaultValue: true,
});
export const openRecentlyQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('arrow-swap'),
    tooltip: vscode.l10n.t('Open recently used folders'),
});
export const backWorkspaceQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('arrow-swap'),
    tooltip: vscode.l10n.t('Open worktree list'),
});
export const useRecentlyQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('pass'),
    tooltip: vscode.l10n.t('Use recently used folders'),
});
export const useFavoriteQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('pass-filled'),
    tooltip: vscode.l10n.t('Use favorite folders'),
});
export const refreshRecentlyQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('refresh'),
    tooltip: vscode.l10n.t('Refresh'),
});
export const refreshFavoriteQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('refresh'),
    tooltip: vscode.l10n.t('Refresh'),
});
export const refreshAllWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('refresh'),
    tooltip: vscode.l10n.t('Refresh'),
});
export const refreshWorkspaceWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('refresh'),
    tooltip: vscode.l10n.t('Refresh'),
});
export const saveRepoQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('star-empty'),
    tooltip: vscode.l10n.t('Save git repository'),
});
export const removeWorktreeQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: vscode.l10n.t('Remove worktree'),
    configKey: 'worktreePick.showRemoveWorktree',
    defaultValue: true,
});
export const deleteBranchQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: vscode.l10n.t('Delete branch'),
    configKey: 'branchPick.showDeleteBranch',
    defaultValue: true,
});
export const renameBranchQuickInputButton = new QuickInputButton({
    iconPath: new vscode.ThemeIcon('edit'),
    tooltip: vscode.l10n.t('Rename branch'),
    configKey: 'branchPick.showRenameBranch',
    defaultValue: true,
});
