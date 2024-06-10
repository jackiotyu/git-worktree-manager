import * as vscode from 'vscode';
import { refreshWorkTreeCmd } from '@/core/command/refreshWorkTreeCmd';
import { switchWorkTreeCmd } from '@/core/command/switchWorkTreeCmd';
import { addWorkTreeCmd } from '@/core/command/addWorkTreeCmd';
import { repairWorkTreeCmd } from '@/core/command/repairWorkTreeCmd';
import { removeWorkTreeCmd } from '@/core/command/removeWorkTreeCmd';
import { moveWorkTreeCmd } from '@/core/command/moveWorkTreeCmd';
import { lockWorkTreeCmd } from '@/core/command/lockWorkTreeCmd';
import { unlockWorkTreeCmd } from '@/core/command/unlockWorkTreeCmd';
import { switchToSelectFolderCmd } from '@/core/command/switchToSelectFolderCmd';
import { revealInSystemExplorerCmd } from '@/core/command/revealInSystemExplorerCmd';
import { addWorkTreeFromBranchCmd } from '@/core/command/addWorkTreeFromBranchCmd';
import { pruneWorkTreeCmd } from '@/core/command/pruneWorkTreeCmd';
import { openSettingCmd } from '@/core/command/openSettingCmd';
import { addGitFolderCmd } from '@/core/command/addGitFolderCmd';
import { refreshGitFolderCmd } from '@/core/command/refreshGitFolderCmd';
import { removeGitFolderCmd } from '@/core/command/removeGitFolderCmd';
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
import { pushWorkTreeCmd } from '@/core/command/pushWorkTreeCmd';
import { pullWorkTreeCmd } from '@/core/command/pullWorkTreeCmd';
import { loadAllTreeDataCmd } from '@/core/command/loadAllTreeDataCmd';
import { viewHistoryCmd } from '@/core/command/viewHistoryCmd';
import { openRecentCmd } from '@/core/command/openRecentCmd';
import { watchWorktreeEventCmd } from '@/core/command/watchWorktreeEventCmd';
import { unwatchWorktreeEventCmd } from '@/core/command/unwatchWorktreeEventCmd';
import { fetchWorkTreeCmd } from '@/core/command/fetchWorkTreeCmd';
import { fetchRepoCmd } from '@/core/command/fetchRepoCmd';
import { toggleLogCmd } from '@/core/command/toggleLogCmd';
import { openRepositoryCmd } from '@/core/command/openRepositoryCmd';
import { Commands } from '@/constants';
import { AllViewItem } from '@/core/treeView/items';

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.refreshWorkTree, refreshWorkTreeCmd),
            vscode.commands.registerCommand(Commands.switchWorkTree, switchWorkTreeCmd),
            vscode.commands.registerCommand(Commands.addWorkTree, addWorkTreeCmd),
            vscode.commands.registerCommand(Commands.repairWorkTree, repairWorkTreeCmd),
            vscode.commands.registerCommand(Commands.removeWorkTree, removeWorkTreeCmd),
            vscode.commands.registerCommand(Commands.moveWorkTree, moveWorkTreeCmd),
            vscode.commands.registerCommand(Commands.lockWorkTree, lockWorkTreeCmd),
            vscode.commands.registerCommand(Commands.unlockWorkTree, unlockWorkTreeCmd),
            vscode.commands.registerCommand(Commands.switchToSelectFolder, switchToSelectFolderCmd),
            vscode.commands.registerCommand(Commands.addWorkTreeFromBranch, addWorkTreeFromBranchCmd),
            vscode.commands.registerCommand(Commands.revealInSystemExplorer, (item: AllViewItem) =>
                revealInSystemExplorerCmd(item),
            ),
            vscode.commands.registerCommand(Commands.revealInSystemExplorerContext, (item: AllViewItem) =>
                revealInSystemExplorerCmd(item, false),
            ),
            vscode.commands.registerCommand(Commands.pruneWorkTree, pruneWorkTreeCmd),
            vscode.commands.registerCommand(Commands.openSetting, openSettingCmd),
            vscode.commands.registerCommand(Commands.addGitFolder, addGitFolderCmd),
            vscode.commands.registerCommand(Commands.refreshGitFolder, refreshGitFolderCmd),
            vscode.commands.registerCommand(Commands.removeGitFolder, removeGitFolderCmd),
            vscode.commands.registerCommand(Commands.renameGitFolder, renameGitFolderCmd),
            vscode.commands.registerCommand(Commands.openWalkthroughs, openWalkthroughsCmd),
            vscode.commands.registerCommand(Commands.openTerminal, openTerminalCmd),
            vscode.commands.registerCommand(Commands.openExternalTerminal, (item: AllViewItem) =>
                openExternalTerminalCmd(item),
            ),
            vscode.commands.registerCommand(Commands.openExternalTerminalContext, (item: AllViewItem) =>
                openExternalTerminalCmd(item, false),
            ),
            vscode.commands.registerCommand(Commands.addToWorkspace, addToWorkspaceCmd),
            vscode.commands.registerCommand(Commands.removeFromWorkspace, removeFromWorkspaceCmd),
            vscode.commands.registerCommand(Commands.copyFolderPath, copyFolderPathCmd),
            vscode.commands.registerCommand(Commands.refreshRecentFolder, refreshRecentFolderCmd),
            vscode.commands.registerCommand(Commands.addToGitFolder, addToGitFolderCmd),
            vscode.commands.registerCommand(Commands.checkoutBranch, checkoutBranchCmd),
            vscode.commands.registerCommand(Commands.gitFolderSetOpen, toggleGitFolderOpenCmd),
            vscode.commands.registerCommand(Commands.gitFolderSetClose, toggleGitFolderOpenCmd),
            vscode.commands.registerCommand(Commands.searchAllWorktree, searchAllWorktreeCmd),
            vscode.commands.registerCommand(Commands.gitFolderViewAsTree, () => {
                toggleGitFolderViewAs(false);
            }),
            vscode.commands.registerCommand(Commands.gitFolderViewAsList, () => {
                toggleGitFolderViewAs(true);
            }),
            vscode.commands.registerCommand(Commands.pushWorkTree, pushWorkTreeCmd),
            vscode.commands.registerCommand(Commands.pullWorkTree, pullWorkTreeCmd),
            vscode.commands.registerCommand(Commands.loadAllTreeData, loadAllTreeDataCmd),
            vscode.commands.registerCommand(Commands.viewHistory, viewHistoryCmd),
            vscode.commands.registerCommand(Commands.openRecent, openRecentCmd),
            vscode.commands.registerCommand(Commands.watchWorktreeEvent, watchWorktreeEventCmd),
            vscode.commands.registerCommand(Commands.unwatchWorktreeEvent, unwatchWorktreeEventCmd),
            vscode.commands.registerCommand(Commands.fetchWorkTree, fetchWorkTreeCmd),
            vscode.commands.registerCommand(Commands.fetchRepo, fetchRepoCmd),
            vscode.commands.registerCommand(Commands.toggleLog, toggleLogCmd),
            vscode.commands.registerCommand(Commands.openRepository, openRepositoryCmd),
    );
}