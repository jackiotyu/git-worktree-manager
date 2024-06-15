import * as vscode from 'vscode';

export const backButton = vscode.QuickInputButtons.Back;

export const openInNewWindowQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('arrow-right'),
    tooltip: vscode.l10n.t('Switch the current window to this folder.'),
};
export const revealInSystemExplorerQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('folder-opened'),
    tooltip: vscode.l10n.t('Reveal in the system explorer'),
};
export const openExternalTerminalQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('terminal-bash'),
    tooltip: vscode.l10n.t('Open in External Terminal'),
};
export const openTerminalQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('terminal'),
    tooltip: vscode.l10n.t('Open in VSCode built-in Terminal'),
};
export const addToWorkspaceQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('multiple-windows'),
    tooltip: vscode.l10n.t('Add folder to workspace'),
};
export const removeFromWorkspaceQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: vscode.l10n.t('Remove folder from workspace'),
};
export const sortByBranchQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('case-sensitive'),
    tooltip: vscode.l10n.t('Sort by branch name'),
};
export const sortByRepoQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('list-flat'),
    tooltip: vscode.l10n.t('Sort by repository'),
};
export const settingQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('gear'),
    tooltip: vscode.l10n.t('Open Settings'),
};
export const addGitRepoQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('add'),
    tooltip: vscode.l10n.t('Add a git repository folder path'),
};
export const copyItemQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('copy'),
    tooltip: vscode.l10n.t('Copy'),
};
export const useAllWorktreeQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('folder-active'),
    tooltip: vscode.l10n.t('Click to display all worktree list'),
};
export const useWorkspaceWorktreeQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('folder-library'),
    tooltip: vscode.l10n.t('Click to display worktree list in workspace'),
};
export const checkoutBranchQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('source-control'),
    tooltip: vscode.l10n.t('Checkout'),
};
export const addWorktreeQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('new-folder'),
    tooltip: vscode.l10n.t('Create Worktree'),
};
export const moreQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('three-bars'),
    tooltip: vscode.l10n.t('More actions...'),
};
export const viewHistoryQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('history'),
    tooltip: vscode.l10n.t('View git history'),
};
export const openRepositoryQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('repo'),
    tooltip: vscode.l10n.t('Open the repository in Source Control view'),
};
export const openRecentlyQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('graph-left'),
    tooltip: vscode.l10n.t('Open recently used folders'),
};
export const backWorkspaceQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('arrow-left'),
    tooltip: vscode.l10n.t('Back to workspace'),
};