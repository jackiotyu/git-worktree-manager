import { type Uri } from 'vscode';

export const APP_NAME = 'git-worktree-manager';

export enum Commands {
    refreshWorkTree = 'git-worktree-manager.refreshWorkTree',
    switchWorkTree = 'git-worktree-manager.switchWorkTree',
    addWorkTree = 'git-worktree-manager.addWorkTree',
    addGitFolder = 'git-worktree-manager.addGitFolder',
    removeGitFolder = 'git-worktree-manager.removeGitFolder',
    renameGitFolder = 'git-worktree-manager.renameGitFolder',
    repairWorkTree = 'git-worktree-manager.repairWorkTree',
    removeWorkTree = 'git-worktree-manager.removeWorkTree',
    moveWorkTree = 'git-worktree-manager.moveWorkTree',
    lockWorkTree = 'git-worktree-manager.lockWorkTree',
    unlockWorkTree = 'git-worktree-manager.unlockWorkTree',
    pruneWorkTree = 'git-worktree-manager.pruneWorkTree',
    switchToSelectFolder = 'git-worktree-manager.switchToSelectFolder',
    addWorkTreeFromBranch = 'git-worktree-manager.addWorkTreeFromBranch',
    revealInSystemExplorer = 'git-worktree-manager.revealInSystemExplorer',
    openSetting = 'git-worktree-manager.openSetting',
    refreshGitFolder = 'git-worktree-manager.refreshGitFolder',
    openWalkthroughs = 'git-worktree-manager.openWalkthroughs',
    openTerminal = 'git-worktree-manager.openTerminal',
    openWindowsTerminal = 'git-worktree-manager.openWindowsTerminal',
    addToWorkspace = 'git-worktree-manager.addToWorkspace',
    copyFilePath = 'git-worktree-manager.copyFilePath',
    refreshRecentFolder = 'git-worktree-manager.refreshRecentFolder',
    openRecent = 'git-worktree-manager.openRecent',
    addToGitFolder = 'git-worktree-manager.addToGitFolder',
}

export enum TreeItemKind {
    worktree = 'worktree',
    gitFolder = 'gitFolder',
}

export interface FolderItemConfig {
    name: string;
    path: string;
}

export interface RecentFolderConfig extends FolderItemConfig {
    uri: Uri
}

export type AlertLevel = 'warn' | 'info' | 'error';