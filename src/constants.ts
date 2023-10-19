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
    pullWorkTree = 'git-worktree-manager.pullWorkTree',
    pushWorkTree = 'git-worktree-manager.pushWorkTree',
    pruneWorkTree = 'git-worktree-manager.pruneWorkTree',
    switchToSelectFolder = 'git-worktree-manager.switchToSelectFolder',
    addWorkTreeFromBranch = 'git-worktree-manager.addWorkTreeFromBranch',
    revealInSystemExplorer = 'git-worktree-manager.revealInSystemExplorer',
    openSetting = 'git-worktree-manager.openSetting',
    refreshGitFolder = 'git-worktree-manager.refreshGitFolder',
    openWalkthroughs = 'git-worktree-manager.openWalkthroughs',
    openTerminal = 'git-worktree-manager.openTerminal',
    openExternalTerminal = 'git-worktree-manager.openExternalTerminal',
    addToWorkspace = 'git-worktree-manager.addToWorkspace',
    copyFilePath = 'git-worktree-manager.copyFilePath',
    refreshRecentFolder = 'git-worktree-manager.refreshRecentFolder',
    openRecent = 'git-worktree-manager.openRecent',
    addToGitFolder = 'git-worktree-manager.addToGitFolder',
    checkoutBranch = 'git-worktree-manager.checkoutBranch',
    gitFolderViewAsTree = 'git-worktree-manager.gitFolderViewAsTree',
    gitFolderViewAsList = 'git-worktree-manager.gitFolderViewAsList',
    gitFolderSetOpen = 'git-worktree-manager.gitFolderSetOpen',
    gitFolderSetClose = 'git-worktree-manager.gitFolderSetClose',
    searchAllWorktree = 'git-worktree-manager.searchAllWorktree',
    loadMoreRecentFolder = 'git-worktree-manager.loadMoreRecentFolder',
    loadAllTreeData = 'git-worktree-manager.loadAllTreeData',
    viewHistory = 'git-worktree-manager.viewHistory',
}

export enum TreeItemKind {
    worktree = 'worktree',
    gitFolder = 'gitFolder',
}

export type AlertLevel = 'warn' | 'info' | 'error';

export enum ViewId {
    gitWorktreeManagerRecent = 'git-worktree-manager-recent',
    gitWorktreeManagerList = 'git-worktree-manager-list',
    gitWorktreeManagerFolders = 'git-worktree-manager-folders',
}