export const APP_NAME = 'git-worktree-manager';

export enum Commands {
    refreshWorktree = 'git-worktree-manager.refreshWorktree',
    switchWorktree = 'git-worktree-manager.switchWorktree',
    addWorktree = 'git-worktree-manager.addWorktree',
    addGitFolder = 'git-worktree-manager.addGitFolder',
    removeGitFolder = 'git-worktree-manager.removeGitFolder',
    renameGitFolder = 'git-worktree-manager.renameGitFolder',
    repairWorktree = 'git-worktree-manager.repairWorktree',
    removeWorktree = 'git-worktree-manager.removeWorktree',
    moveWorktree = 'git-worktree-manager.moveWorktree',
    lockWorktree = 'git-worktree-manager.lockWorktree',
    unlockWorktree = 'git-worktree-manager.unlockWorktree',
    pullWorktree = 'git-worktree-manager.pullWorktree',
    pushWorktree = 'git-worktree-manager.pushWorktree',
    pruneWorktree = 'git-worktree-manager.pruneWorktree',
    switchToSelectFolder = 'git-worktree-manager.switchToSelectFolder',
    addWorktreeFromBranch = 'git-worktree-manager.addWorktreeFromBranch',
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
    fetchWorktree = 'git-worktree-manager.fetchWorktree',
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