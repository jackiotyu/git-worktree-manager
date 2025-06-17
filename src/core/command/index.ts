import * as vscode from 'vscode';
import { refreshWorktreeCmd } from '@/core/command/refreshWorktreeCmd';
import { switchWorktreeCmd } from '@/core/command/switchWorktreeCmd';
import { addWorktreeCmd } from '@/core/command/addWorktreeCmd';
import { repairWorktreeCmd } from '@/core/command/repairWorktreeCmd';
import { removeWorktreeCmd } from '@/core/command/removeWorktreeCmd';
import { moveWorktreeCmd } from '@/core/command/moveWorktreeCmd';
import { lockWorktreeCmd } from '@/core/command/lockWorktreeCmd';
import { unlockWorktreeCmd } from '@/core/command/unlockWorktreeCmd';
import { switchToSelectWorkspaceCmd } from '@/core/command/switchToSelectWorkspaceCmd';
import { revealInSystemExplorerCmd } from '@/core/command/revealInSystemExplorerCmd';
import { addWorktreeFromBranchCmd } from '@/core/command/addWorktreeFromBranchCmd';
import { pruneWorktreeCmd } from '@/core/command/pruneWorktreeCmd';
import { openSettingCmd } from '@/core/command/openSettingCmd';
import { addGitFolderCmd } from '@/core/command/addGitFolderCmd';
import { refreshGitFolderCmd } from '@/core/command/refreshGitFolderCmd';
import { removeGitFolderCmd } from '@/core/command/removeGitFolderCmd';
import { removeMultiGitFolderCmd } from '@/core/command/removeMultiGitFolderCmd';
import { renameGitFolderCmd } from '@/core/command/renameGitFolderCmd';
import { openWalkthroughsCmd } from '@/core/command/openWalkthroughsCmd';
import { openTerminalCmd } from '@/core/command/openTerminalCmd';
import { openExternalTerminalCmd } from '@/core/command/openExternalTerminalCmd';
import { addToWorkspaceCmd } from '@/core/command/addToWorkspaceCmd';
import { removeFromWorkspaceCmd } from '@/core/command/removeFromWorkspaceCmd';
import { refreshRecentFolderCmd } from '@/core/command/refreshRecentFolderCmd';
import { addToGitFolderCmd } from '@/core/command/addToGitFolderCmd';
import { copyFolderPathCmd } from '@/core/command/copyFolderPathCmd';
import { checkoutBranchCmd } from '@/core/command/checkoutBranchCmd';
import { toggleGitFolderOpenCmd } from '@/core/command/toggleGitFolderOpenCmd';
import { searchAllWorktreeCmd } from '@/core/command/searchAllWorktreeCmd';
import { toggleGitFolderViewAs } from '@/core/command/toggleGitFolderViewAs';
import { pushWorktreeCmd } from '@/core/command/pushWorktreeCmd';
import { pullWorktreeCmd } from '@/core/command/pullWorktreeCmd';
import { loadAllTreeDataCmd } from '@/core/command/loadAllTreeDataCmd';
import { viewHistoryCmd } from '@/core/command/viewHistoryCmd';
import { openRecentCmd } from '@/core/command/openRecentCmd';
import { openWorkspaceWorktreeCmd } from '@/core/command/openWorkspaceWorktreeCmd';
import { watchWorktreeEventCmd } from '@/core/command/watchWorktreeEventCmd';
import { unwatchWorktreeEventCmd } from '@/core/command/unwatchWorktreeEventCmd';
import { fetchWorktreeCmd } from '@/core/command/fetchWorktreeCmd';
import { fetchRepoCmd } from '@/core/command/fetchRepoCmd';
import { toggleLogCmd } from '@/core/command/toggleLogCmd';
import { openRepositoryCmd } from '@/core/command/openRepositoryCmd';
import { addRootsToRepoCmd } from '@/core/command/addRootsToRepoCmd';
import { refreshWorktreeCacheCmd } from '@/core/command/refreshWorktreeCacheCmd';
import { deleteBranchCmd } from '@/core/command/deleteBranchCmd';
import { renameBranchCmd } from '@/core/command/renameBranchCmd';
import { bundleRepoCmd } from '@/core/command/bundleRepoCmd';
import { openFavoritesCmd } from '@/core/command/openFavoritesCmd';
import { refreshFavoritesCmd } from '@/core/command/refreshFavoritesCmd';
import { removeFavoriteCmd } from '@/core/command/removeFavoriteCmd';
import { removeMultiFavoriteCmd } from '@/core/command/removeMultiFavoriteCmd';
import { addToFavoriteCmd } from '@/core/command/addToFavoriteCmd';
import { Commands } from '@/constants';
import { AllViewItem } from '@/core/treeView/items';

export function registerCommands(context: vscode.ExtensionContext) {
    const registerCommand = vscode.commands.registerCommand.bind(vscode.commands);
    context.subscriptions.push(
        registerCommand(Commands.refreshWorktree, refreshWorktreeCmd),
        registerCommand(Commands.switchWorktree, switchWorktreeCmd),
        registerCommand(Commands.addWorktree, addWorktreeCmd),
        registerCommand(Commands.repairWorktree, repairWorktreeCmd),
        registerCommand(Commands.removeWorktree, removeWorktreeCmd),
        registerCommand(Commands.moveWorktree, moveWorktreeCmd),
        registerCommand(Commands.lockWorktree, lockWorktreeCmd),
        registerCommand(Commands.unlockWorktree, unlockWorktreeCmd),
        registerCommand(Commands.switchToSelectWorkspace, switchToSelectWorkspaceCmd),
        registerCommand(Commands.addWorktreeFromBranch, addWorktreeFromBranchCmd),
        registerCommand(Commands.revealInSystemExplorer, (item: AllViewItem) =>
            revealInSystemExplorerCmd(item),
        ),
        registerCommand(Commands.revealInSystemExplorerContext, (item: AllViewItem) =>
            revealInSystemExplorerCmd(item, false),
        ),
        registerCommand(Commands.pruneWorktree, pruneWorktreeCmd),
        registerCommand(Commands.openSetting, openSettingCmd),
        registerCommand(Commands.addGitFolder, addGitFolderCmd),
        registerCommand(Commands.refreshGitFolder, refreshGitFolderCmd),
        registerCommand(Commands.removeGitFolder, removeGitFolderCmd),
        registerCommand(Commands.removeMultiGitFolder, removeMultiGitFolderCmd),
        registerCommand(Commands.renameGitFolder, renameGitFolderCmd),
        registerCommand(Commands.openWalkthroughs, openWalkthroughsCmd),
        registerCommand(Commands.openTerminal, openTerminalCmd),
        registerCommand(Commands.openExternalTerminal, (item: AllViewItem) =>
            openExternalTerminalCmd(item),
        ),
        registerCommand(Commands.openExternalTerminalContext, (item: AllViewItem) =>
            openExternalTerminalCmd(item, false),
        ),
        registerCommand(Commands.addToWorkspace, addToWorkspaceCmd),
        registerCommand(Commands.removeFromWorkspace, removeFromWorkspaceCmd),
        registerCommand(Commands.copyFolderPath, copyFolderPathCmd),
        registerCommand(Commands.refreshRecentFolder, refreshRecentFolderCmd),
        registerCommand(Commands.addToGitFolder, addToGitFolderCmd),
        registerCommand(Commands.checkoutBranch, checkoutBranchCmd),
        registerCommand(Commands.gitFolderSetOpen, toggleGitFolderOpenCmd),
        registerCommand(Commands.gitFolderSetClose, toggleGitFolderOpenCmd),
        registerCommand(Commands.searchAllWorktree, searchAllWorktreeCmd),
        registerCommand(Commands.gitFolderViewAsTree, () => {
            toggleGitFolderViewAs(false);
        }),
        registerCommand(Commands.gitFolderViewAsList, () => {
            toggleGitFolderViewAs(true);
        }),
        registerCommand(Commands.pushWorktree, pushWorktreeCmd),
        registerCommand(Commands.pullWorktree, pullWorktreeCmd),
        registerCommand(Commands.loadAllTreeData, loadAllTreeDataCmd),
        registerCommand(Commands.viewHistory, viewHistoryCmd),
        registerCommand(Commands.openRecent, openRecentCmd),
        registerCommand(Commands.openWorkspaceWorktree, openWorkspaceWorktreeCmd),
        registerCommand(Commands.watchWorktreeEvent, watchWorktreeEventCmd),
        registerCommand(Commands.unwatchWorktreeEvent, unwatchWorktreeEventCmd),
        registerCommand(Commands.fetchWorktree, fetchWorktreeCmd),
        registerCommand(Commands.fetchRepo, fetchRepoCmd),
        registerCommand(Commands.toggleLog, toggleLogCmd),
        registerCommand(Commands.openRepository, openRepositoryCmd),
        registerCommand(Commands.addRootsToRepo, addRootsToRepoCmd),
        registerCommand(Commands.refreshWorktreeCache, refreshWorktreeCacheCmd),
        registerCommand(Commands.deleteBranch, deleteBranchCmd),
        registerCommand(Commands.renameBranch, renameBranchCmd),
        registerCommand(Commands.bundleRepo, bundleRepoCmd),
        registerCommand(Commands.refreshFavorites, refreshFavoritesCmd),
        registerCommand(Commands.openFavorites, openFavoritesCmd),
        registerCommand(Commands.removeFavorite, removeFavoriteCmd),
        registerCommand(Commands.removeMultiFavorite, removeMultiFavoriteCmd),
        registerCommand(Commands.addToFavorite, addToFavoriteCmd),
    );
}
