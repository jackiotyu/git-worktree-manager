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
    revealInSystemExplorerContext = 'git-worktree-manager.revealInSystemExplorer.context',
    openSetting = 'git-worktree-manager.openSetting',
    refreshGitFolder = 'git-worktree-manager.refreshGitFolder',
    openWalkthroughs = 'git-worktree-manager.openWalkthroughs',
    openTerminal = 'git-worktree-manager.openTerminal',
    openExternalTerminal = 'git-worktree-manager.openExternalTerminal',
    openExternalTerminalContext = 'git-worktree-manager.openExternalTerminal.context',
    addToWorkspace = 'git-worktree-manager.addToWorkspace',
    removeFromWorkspace = 'git-worktree-manager.removeFromWorkspace',
    copyFolderPath = 'git-worktree-manager.copyFolderPath',
    refreshRecentFolder = 'git-worktree-manager.refreshRecentFolder',
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
    openRecent = 'git-worktree-manager.openRecent',
    fetchWorkTree = 'git-worktree-manager.fetchWorkTree',
    fetchRepo = 'git-worktree-manager.fetchRepo',
    toggleLog = 'git-worktree-manager.toggleLog',
    openRepository = 'git-worktree-manager.openRepository',

    watchWorktreeEvent = 'git-worktree-manager.internal.watchWorktreeEvent',
    unwatchWorktreeEvent = 'git-worktree-manager.internal.unwatchWorktreeEvent',
}

export const WORK_TREE_SCHEME = 'git-worktree-manager-scheme';

export const WORK_TREE = 'worktree';

export enum TreeItemKind {
    worktree = 'worktree',
    workspaceGitMainFolder = 'workspaceGitMainFolder',
    gitFolder = 'gitFolder',
    folder = 'folder',
    setting = 'setting',
}

export enum QuickPickKind {
    pickWorktree = 'pickWorktree',
}

export type AlertLevel = 'warn' | 'info' | 'error';

export enum ViewId {
    folderList = 'git-worktree-manager-recent',
    worktreeList = 'git-worktree-manager-list',
    gitFolderList = 'git-worktree-manager-folders',
    settingList = 'git-worktree-manager-setting',
}