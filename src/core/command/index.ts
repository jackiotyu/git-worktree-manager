import * as vscode from 'vscode';
import { refreshWorktreeCmd } from '@/core/command/refreshWorktreeCmd';
import { switchWorktreeCmd } from '@/core/command/switchWorktreeCmd';
import { addWorktreeCmd } from '@/core/command/addWorktreeCmd';
import { repairWorktreeCmd } from '@/core/command/repairWorktreeCmd';
import { removeWorktreeCmd } from '@/core/command/removeWorktreeCmd';
import { moveWorktreeCmd } from '@/core/command/moveWorktreeCmd';
import { lockWorktreeCmd } from '@/core/command/lockWorktreeCmd';
import { unlockWorktreeCmd } from '@/core/command/unlockWorktreeCmd';
import { switchToSelectFolderCmd } from '@/core/command/switchToSelectFolderCmd';
import { revealInSystemExplorerCmd } from '@/core/command/revealInSystemExplorerCmd';
import { addWorktreeFromBranchCmd } from '@/core/command/addWorktreeFromBranchCmd';
import { pruneWorktreeCmd } from '@/core/command/pruneWorktreeCmd';
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
import { pushWorktreeCmd } from '@/core/command/pushWorktreeCmd';
import { pullWorktreeCmd } from '@/core/command/pullWorktreeCmd';
import { loadAllTreeDataCmd } from '@/core/command/loadAllTreeDataCmd';
import { viewHistoryCmd } from '@/core/command/viewHistoryCmd';
import { openRecentCmd } from '@/core/command/openRecentCmd';
import { watchWorktreeEventCmd } from '@/core/command/watchWorktreeEventCmd';
import { unwatchWorktreeEventCmd } from '@/core/command/unwatchWorktreeEventCmd';
import { fetchWorktreeCmd } from '@/core/command/fetchWorktreeCmd';
import { fetchRepoCmd } from '@/core/command/fetchRepoCmd';
import { toggleLogCmd } from '@/core/command/toggleLogCmd';
import { openRepositoryCmd } from '@/core/command/openRepositoryCmd';
import { Commands } from '@/constants';
import { AllViewItem } from '@/core/treeView/items';

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.refreshWorktree, refreshWorktreeCmd),
            vscode.commands.registerCommand(Commands.switchWorktree, switchWorktreeCmd),
            vscode.commands.registerCommand(Commands.addWorktree, addWorktreeCmd),
            vscode.commands.registerCommand(Commands.repairWorktree, repairWorktreeCmd),
            vscode.commands.registerCommand(Commands.removeWorktree, removeWorktreeCmd),
            vscode.commands.registerCommand(Commands.moveWorktree, moveWorktreeCmd),
            vscode.commands.registerCommand(Commands.lockWorktree, lockWorktreeCmd),
            vscode.commands.registerCommand(Commands.unlockWorktree, unlockWorktreeCmd),
            vscode.commands.registerCommand(Commands.switchToSelectFolder, switchToSelectFolderCmd),
            vscode.commands.registerCommand(Commands.addWorktreeFromBranch, addWorktreeFromBranchCmd),
            vscode.commands.registerCommand(Commands.revealInSystemExplorer, (item: AllViewItem) =>
                revealInSystemExplorerCmd(item),
            ),
            vscode.commands.registerCommand(Commands.revealInSystemExplorerContext, (item: AllViewItem) =>
                revealInSystemExplorerCmd(item, false),
            ),
            vscode.commands.registerCommand(Commands.pruneWorktree, pruneWorktreeCmd),
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
            vscode.commands.registerCommand(Commands.pushWorktree, pushWorktreeCmd),
            vscode.commands.registerCommand(Commands.pullWorktree, pullWorktreeCmd),
            vscode.commands.registerCommand(Commands.loadAllTreeData, loadAllTreeDataCmd),
            vscode.commands.registerCommand(Commands.viewHistory, viewHistoryCmd),
            vscode.commands.registerCommand(Commands.openRecent, openRecentCmd),
            vscode.commands.registerCommand(Commands.watchWorktreeEvent, watchWorktreeEventCmd),
            vscode.commands.registerCommand(Commands.unwatchWorktreeEvent, unwatchWorktreeEventCmd),
            vscode.commands.registerCommand(Commands.fetchWorktree, fetchWorktreeCmd),
            vscode.commands.registerCommand(Commands.fetchRepo, fetchRepoCmd),
            vscode.commands.registerCommand(Commands.toggleLog, toggleLogCmd),
            vscode.commands.registerCommand(Commands.openRepository, openRepositoryCmd),
    );
}