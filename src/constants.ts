export const APP_NAME = 'git-worktree-manager';

export enum Commands {
    refreshWorktree = 'git-worktree-manager.refreshWorktree',
    switchWorktree = 'git-worktree-manager.switchWorktree',
    addWorktree = 'git-worktree-manager.addWorktree',
    addGitFolder = 'git-worktree-manager.addGitFolder',
    addToFavorite = 'git-worktree-manager.addToFavorite',
    addRootsToRepo = 'git-worktree-manager.addRootsToRepo',
    removeFavorite = 'git-worktree-manager.removeFavorite',
    removeMultiFavorite = 'git-worktree-manager.removeMultiFavorite',
    removeGitFolder = 'git-worktree-manager.removeGitFolder',
    removeMultiGitFolder = 'git-worktree-manager.removeMultiGitFolder',
    renameGitFolder = 'git-worktree-manager.renameGitFolder',
    repairWorktree = 'git-worktree-manager.repairWorktree',
    removeWorktree = 'git-worktree-manager.removeWorktree',
    moveWorktree = 'git-worktree-manager.moveWorktree',
    lockWorktree = 'git-worktree-manager.lockWorktree',
    unlockWorktree = 'git-worktree-manager.unlockWorktree',
    pullWorktree = 'git-worktree-manager.pullWorktree',
    pushWorktree = 'git-worktree-manager.pushWorktree',
    pruneWorktree = 'git-worktree-manager.pruneWorktree',
    switchToSelectWorkspace = 'git-worktree-manager.switchToSelectWorkspace',
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
    copyFilePath = 'git-worktree-manager.copyFilePath',
    refreshRecentFolder = 'git-worktree-manager.refreshRecentFolder',
    refreshFavorite = 'git-worktree-manager.refreshFavorite',
    addToGitFolder = 'git-worktree-manager.addToGitFolder',
    checkoutBranch = 'git-worktree-manager.checkoutBranch',
    deleteBranch = 'git-worktree-manager.deleteBranch',
    gitFolderViewAsTree = 'git-worktree-manager.gitFolderViewAsTree',
    gitFolderViewAsList = 'git-worktree-manager.gitFolderViewAsList',
    gitFolderSetOpen = 'git-worktree-manager.gitFolderSetOpen',
    gitFolderSetClose = 'git-worktree-manager.gitFolderSetClose',
    searchAllWorktree = 'git-worktree-manager.searchAllWorktree',
    loadMoreRecentFolder = 'git-worktree-manager.loadMoreRecentFolder',
    loadAllTreeData = 'git-worktree-manager.loadAllTreeData',
    viewHistory = 'git-worktree-manager.viewHistory',
    openRecent = 'git-worktree-manager.openRecent',
    openFavorite = 'git-worktree-manager.openFavorite',
    openWorkspaceWorktree = 'git-worktree-manager.openWorkspaceWorktree',
    fetchWorktree = 'git-worktree-manager.fetchWorktree',
    fetchRepo = 'git-worktree-manager.fetchRepo',
    toggleLog = 'git-worktree-manager.toggleLog',
    openRepository = 'git-worktree-manager.openRepository',
    openChanges = 'git-worktree-manager.openChanges',
    bundleRepo = 'git-worktree-manager.bundleRepo',

    renameBranch = 'git-worktree-manager.internal.renameBranch',
    refreshWorktreeCache = 'git-worktree-manager.internal.refreshWorktreeCache',
    watchWorktreeEvent = 'git-worktree-manager.internal.watchWorktreeEvent',
    unwatchWorktreeEvent = 'git-worktree-manager.internal.unwatchWorktreeEvent',
}

export enum ContextKey {
    gitFolderViewAsTree = 'gwm.context.gitFolderViewAsTree',
    addRootsToRepo = 'gwm.context.addRootsToRepo',
}

export const WORK_TREE_SCHEME = 'git-worktree-manager-scheme';

export const WORK_TREE = 'worktree';

export enum TreeItemKind {
    worktree = 'worktree',
    workspaceGitMainFolder = 'workspaceGitMainFolder',
    gitFolder = 'gitFolder',
    folder = 'folder',
    setting = 'setting',
    file = 'file',
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
    worktreeListSCM = 'git-worktree-manager-list.scm',
    gitFolderListSCM = 'git-worktree-manager-folders.scm',
    favorite = 'git-worktree-manager-favorite',
}

export const refArgList = [
    'refname',
    'objectname:short',
    '*objectname',
    'worktreepath',
    'authordate',
    '*authordate',
    'HEAD',
    'refname:short',
    'taggername',
    'authorname',
    '*authorname',
    'subject',
    '*subject',
] as const;

export enum HEAD {
    current = '*',
}

export enum StateKey {
    gitFolderViewAsTree = 'gitFolderViewAsTree',
    gitFolders = 'gitFolders',
    workTreeCache = 'workTreeCache',
    mainFolders = 'mainFolders',
}

export enum RefreshCacheType {
    all = 'all',
    workspace = 'workspace',
}

export enum RecentItemType {
    workspace = 0,
    folder = 1,
    file = 2,
}