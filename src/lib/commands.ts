import * as vscode from 'vscode';
import {
    updateTreeDataEvent,
    updateFolderEvent,
    updateRecentEvent,
    toggleGitFolderViewAsEvent,
    loadAllTreeDataEvent,
    revealTreeItemEvent,
} from '@/lib/events';
import localize from '@/localize';
import {
    getFolderIcon,
    getWorkTreeList,
    removeWorkTree,
    addWorkTree,
    repairWorkTree,
    moveWorkTree,
    unlockWorkTree,
    lockWorkTree,
    pullOrPushAction,
    pruneWorkTree,
    checkGitValid,
    checkoutBranch,
    openExternalTerminal,
    addToWorkspace,
    checkExist,
} from '@/utils';
import { pickBranch, pickWorktree } from '@/lib/quickPick';
import { confirmModal } from '@/lib/modal';
import { Commands, APP_NAME } from '@/constants';
import folderRoot from '@/lib/folderRoot';
import type { WorkTreeItem, GitFolderItem, FolderItem, AllViewItem } from '@/lib/treeView';
import { GlobalState } from '@/lib/globalState';
import * as util from 'util';
import path from 'path';
import { Alert } from '@/lib/adaptor/window';
import { GitHistory } from '@/lib/adaptor/gitHistory';
import { ILoadMoreItem, IFolderItemConfig } from '@/types';
import { actionProgressWrapper } from '@/lib/progress';
import logger from '@/lib/logger';

interface CmdItem extends vscode.QuickPickItem {
    use?: 'close';
}

const checkFolderExist = async (path: string) => {
    let exist = await checkExist(path);
    if (!exist) {
        Alert.showErrorMessage(localize('msg.error.folderNotExist'), { modal: true });
        return false;
    }
    return true;
};

export const switchWorkTreeCmd = async () => {
    let workTrees = await getWorkTreeList();
    const items: vscode.QuickPickItem[] = workTrees.map((item) => {
        return {
            label: item.name,
            description: item.path,
            iconPath: getFolderIcon(item.path),
        };
    });
    const options: vscode.QuickPickOptions = {
        canPickMany: false,
        placeHolder: localize('msg.placeHolder.switchWorkTree'),
        title: localize('msg.title.switchWorkTree'),
    };
    vscode.window.showQuickPick(items, options).then((workTree) => {
        if (!workTree) {
            return;
        }
        let path = workTrees[workTrees.findIndex((object) => object.name === workTree.label)].path;
        let uri = vscode.Uri.file(path);
        vscode.commands.executeCommand('vscode.openFolder', uri, {
            forceNewWindow: true,
        });
    });
};
export const refreshWorkTreeCmd = () => {
    updateTreeDataEvent.fire();
};

const createWorkTreeFromInfo = async (info: { folderPath: string; name: string; label: string }) => {
    const { folderPath, name, label } = info;
    let confirmCreate = await confirmModal(
        localize('msg.modal.title.createWorkTree'),
        localize('msg.modal.detail.createWorkTree', folderPath, label, name),
    );
    if (!confirmCreate) {
        return;
    }
    let created = await addWorkTree(folderPath, name || '');
    if (!created) {
        return;
    }
    updateTreeDataEvent.fire();
    let confirmOpen = await confirmModal(
        localize('msg.modal.title.openFolder'),
        localize('msg.modal.detail.openFolder'),
    );
    if (!confirmOpen) {
        return;
    }
    let folderUri = vscode.Uri.file(folderPath);
    vscode.commands.executeCommand('vscode.openFolder', folderUri, {
        forceNewWindow: true,
    });
};

export const addWorkTreeCmd = async () => {
    let branchItem = await pickBranch();
    if (!branchItem) {
        return;
    }
    let { branch, hash } = branchItem;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: localize('msg.modal.title.pickFolder'),
        title: localize('msg.modal.detail.pickFolder'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    let label = branch ? localize('branch') : localize('commitHash');
    await createWorkTreeFromInfo({
        name: branch || hash || '',
        label,
        folderPath,
    });
};

const removeWorkTreeCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        const confirm = await confirmModal(
            localize('msg.modal.title.deleteWorkTree'),
            localize('msg.modal.detail.deleteWorkTree', item.path),
        );
        if (!confirm) {
            return;
        }
        await removeWorkTree(item.path, item.parent?.path);
        Alert.showInformationMessage(localize('msg.success.deleteWorkTree', item.path));
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.deleteWorkTree', String(error)));
        logger.error(error);
    }
    updateTreeDataEvent.fire();
};

const addWorkTreeFromBranchCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: localize('msg.modal.title.pickFolder'),
        title: localize('msg.modal.detail.pickFolder'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    return createWorkTreeFromInfo({
        name: item.name,
        label: '分支',
        folderPath,
    });
};

const revealTreeItem = (item: AllViewItem) => {
    revealTreeItemEvent.fire(item);
    return new Promise((r) => process.nextTick(r));
};

const revealInSystemExplorerCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    if (needRevealTreeItem) await revealTreeItem(item);
    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.path));
};

const commonWorkTreeCmd = async (path: string, cmd: Commands, cwd?: string) => {
    let cmdName = localize('operation');
    try {
        switch (cmd) {
            case Commands.lockWorkTree:
                await lockWorkTree(path, cwd);
                cmdName = localize('lock');
                break;
            case Commands.unlockWorkTree:
                await unlockWorkTree(path, cwd);
                cmdName = localize('unlock');
                break;
            case Commands.repairWorkTree:
                await repairWorkTree(path, cwd);
                cmdName = localize('repair');
                break;
        }
        Alert.showInformationMessage(localize('msg.success.commonAction', cmdName));
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.commonAction', cmdName, util.inspect(error, false, 1, true)));
        logger.error(error);
    }
    updateTreeDataEvent.fire();
};

const repairWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.repairWorkTree, item.parent?.path);
};

const lockWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.lockWorkTree, item.parent?.path);
};

const unlockWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item) return;
    commonWorkTreeCmd(item.path, Commands.unlockWorkTree, item.parent?.path);
};

const moveWorkTreeCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        let uriList = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: folderRoot.uri,
            openLabel: localize('msg.modal.title.pickFolder'),
            title: localize('msg.modal.detail.moveToFolder', item.path),
        });
        if (!uriList?.length) {
            return;
        }
        let folderUri = uriList[0];
        await moveWorkTree(item.path, folderUri.fsPath, item.parent?.path);
        Alert.showInformationMessage(localize('msg.success.moveWorkTree'));
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.moveWorkTree', String(error)));
        logger.error(error);
    }
    updateTreeDataEvent.fire();
};

const switchToSelectFolderCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.path), {
            forceNewWindow: false,
            forceReuseWindow: true,
        });
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.switchWorkTree', String(error)));
        logger.error(error);
    }
};

const pruneWorkTreeCmd = async () => {
    try {
        let output = await pruneWorkTree(true);
        if (!output?.length) {
            return;
        }
        let ok = localize('ok');
        let confirm = await Alert.showInformationMessage(
            localize('msg.modal.title.pruneWorkTree'),
            {
                detail: output.join('  \n'),
                modal: true,
            },
            ok,
        );
        if (confirm !== ok) {
            return;
        }
        await pruneWorkTree();
        Alert.showInformationMessage(localize('msg.success.pruneWorkTree'));
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.pruneWorkTree'));
        logger.error(error);
    }
    updateTreeDataEvent.fire();
};

function openSettingCmd() {
    void vscode.commands.executeCommand('workbench.action.openSettings', `@ext:jackiotyu.git-worktree-manager`);
}

function getFolderConfig() {
    return GlobalState.get('gitFolders', []);
}

function getTerminalLocationConfig() {
    return vscode.workspace.getConfiguration(APP_NAME).get<string>('terminalLocationInEditor')
        ? vscode.TerminalLocation.Editor
        : vscode.TerminalLocation.Panel;
}

function getTerminalCmdListConfig() {
    return vscode.workspace.getConfiguration(APP_NAME).get<string[]>('terminalCmdList', []);
}

function updateFolderConfig(value: IFolderItemConfig[]) {
    return GlobalState.update('gitFolders', value);
}

async function updateFolderItem(config: IFolderItemConfig) {
    let allFolders = getFolderConfig();
    let index = allFolders.findIndex((i) => i.path === config.path);
    if (~index) {
        allFolders[index] = config;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(localize('msg.success.save'));
    }
}

const addToGitFolder = async (folderPath: string) => {
    if (!(await checkFolderExist(folderPath))) {
        return;
    }
    let existFolders = getFolderConfig();
    if (!(await checkGitValid(folderPath))) {
        return Alert.showErrorMessage(localize('msg.error.invalidGitFolder'));
    }
    const worktreeList = await getWorkTreeList(folderPath, true);
    const mainFolder = worktreeList.find((i) => i.isMain);
    const mainFolderPath = mainFolder?.path ? vscode.Uri.file(mainFolder.path).fsPath : '';
    if (mainFolderPath && mainFolderPath !== folderPath) {
        let ok = await confirmModal(
            localize('msg.modal.title.pickMainFolder'),
            localize('msg.modal.placeholder.pickMainFolder', folderPath, mainFolderPath),
        );
        if (ok) {
            folderPath = mainFolderPath;
        }
    }
    if (existFolders.some((i) => i.path === folderPath)) {
        return Alert.showErrorMessage(localize('msg.error.gitFolderExistInSetting'));
    }
    let folderName = await vscode.window.showInputBox({
        title: localize('msg.modal.title.inputGitFolderName'),
        placeHolder: localize('msg.modal.placeholder.inputGitFolderName'),
        value: folderPath,
        validateInput: (value) => {
            if (!value) {
                return localize('msg.modal.placeholder.inputGitFolderName');
            }
        },
    });
    if (!folderName) {
        return;
    }
    existFolders.push({ name: folderName, path: folderPath });
    await updateFolderConfig(existFolders);
    Alert.showInformationMessage(localize('msg.success.save'));
};

const addGitFolderCmd = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        openLabel: localize('msg.modal.title.addGitFolder'),
        title: localize('msg.modal.detail.addGitFolder'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    await addToGitFolder(folderPath);
};

const refreshGitFolderCmd = () => {
    updateFolderEvent.fire();
};

const pickFolderConfig = (item?: GitFolderItem) => {
    if (!item) return;
    return getFolderConfig().find((row) => row.path === item.path);
};

const removeGitFolderCmd = async (item: GitFolderItem) => {
    let path = item.path;
    let folders = getFolderConfig();
    if (!folders.some((f) => f.path === path)) {
        return;
    }
    let ok = await confirmModal(
        localize('msg.modal.title.removeGitFolder'),
        localize('msg.modal.placeholder.removeGitFolder', item.path, item.name),
    );
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => f.path !== path);
    await updateFolderConfig(folders);
    Alert.showInformationMessage(localize('msg.success.remove'));
};

const renameGitFolderCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    let folder = pickFolderConfig(item);
    if (!folder) {
        return;
    }
    const path = folder.path;
    let name = await vscode.window.showInputBox({
        title: localize('msg.modal.title.renameGitFolder'),
        placeHolder: localize('msg.modal.title.inputGitFolderName'),
        value: folder.name,
        validateInput(value) {
            if (!value) {
                return localize('msg.modal.title.inputGitFolderName');
            }
        },
    });
    if (!name) {
        return;
    }
    folder.name = name;
    let allFolders = getFolderConfig();
    let index = allFolders.findIndex((i) => i.path === path);
    if (~index) {
        allFolders[index].name = name;
        await updateFolderConfig(allFolders);
        Alert.showInformationMessage(localize('msg.success.save'));
    }
};

const openWalkthroughsCmd = () => {
    vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'jackiotyu.git-worktree-manager#git-worktree-usage',
        false,
    );
};

const openTerminalCmd = async (item?: AllViewItem) => {
    if (!item) return;
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    const terminal = vscode.window.createTerminal({
        cwd: item.path,
        name: item.name,
        iconPath: new vscode.ThemeIcon('terminal-bash'),
        isTransient: false,
        hideFromUser: false,
        location: getTerminalLocationConfig(),
    });
    terminal.show();
    const cmdList = getTerminalCmdListConfig();
    if (!cmdList.length) {
        return;
    }
    let cmdText = cmdList[0];
    let cancelToken = new vscode.CancellationTokenSource();
    let disposable = vscode.window.onDidCloseTerminal(async (t) => {
        let [pid, currentPid] = await Promise.all([t.processId, terminal.processId]);
        if (pid === currentPid) {
            cancelToken.cancel();
            disposable.dispose();
        }
    });
    if (cmdList.length > 1) {
        const items: CmdItem[] = cmdList.map((text) => {
            return {
                label: text,
                iconPath: new vscode.ThemeIcon('terminal-bash'),
            };
        });
        let item = await vscode.window.showQuickPick(
            items,
            {
                title: localize('msg.modal.title.selectCmd'),
                placeHolder: localize('msg.modal.placeholder.selectCmd'),
                canPickMany: false,
            },
            cancelToken.token,
        );
        cmdText = item && item.use !== 'close' ? item.label : '';
    }
    // FIXME delay for prevent terminal dirty data
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    cmdText && terminal.sendText(cmdText, true);
};

const openExternalTerminalCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    try {
        if (needRevealTreeItem) await revealTreeItem(item);
        await openExternalTerminal(`${item.path}`);
    } catch (error) {
        Alert.showErrorMessage(localize('msg.fail.invokeExternalTerminal', String(error)));
    }
};

const addToWorkspaceCmd = async (item: WorkTreeItem | FolderItem) => {
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    return addToWorkspace(item.path);
};

const copyFilePathCmd = (item?: AllViewItem) => {
    if (!item) return;
    vscode.env.clipboard.writeText(item.path).then(() => {
        Alert.showInformationMessage(localize('msg.success.copy', item.path));
    });
};

const refreshRecentFolderCmd = () => {
    updateRecentEvent.fire();
};

const openRecentCmd = () => {
    return vscode.commands.executeCommand('workbench.action.openRecent');
};

const addToGitFolderCmd = (item?: FolderItem) => {
    if (!item) return;
    return addToGitFolder(item.path);
};

const checkoutBranchCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    let branchItem = await pickBranch(
        localize('msg.info.checkoutBranch', `${item.name} ⇄ ...${item.path.slice(-24)}`),
        localize('msg.placeholder.checkoutBranch'),
        item.path,
    );
    if (!branchItem) return;
    const checkoutText = branchItem.branch || branchItem.hash || '';
    const prefix = checkoutText === branchItem.hash ? '--detach' : '';
    actionProgressWrapper(
        localize('msg.info.checkoutBranch', checkoutText),
        () => checkoutBranch(item.path, checkoutText, prefix),
        updateTreeDataEvent.fire.bind(updateTreeDataEvent),
    );
};

const toggleGitFolderViewAs = (asTree: boolean) => {
    toggleGitFolderViewAsEvent.fire(asTree);
};

const toggleGitFolderOpenCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    item.defaultOpen = !item.defaultOpen;
    await updateFolderItem({
        name: item.name,
        path: item.path,
        defaultOpen: item.defaultOpen,
    });
};

const searchAllWorktreeCmd = () => {
    pickWorktree();
};

const pushWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item || !item.remoteRef || !item.remote) return;
    pullOrPushAction('push', {
        branch: item.name,
        cwd: item.path,
        remote: item.remote,
        remoteRef: item.remoteRef,
    });
};

const pullWorkTreeCmd = (item?: WorkTreeItem) => {
    if (!item || !item.remoteRef || !item.remote) return;
    pullOrPushAction('pull', {
        branch: item.name,
        cwd: item.path,
        remote: item.remote,
        remoteRef: item.remoteRef,
    });
};

const loadAllTreeDataCmd = (item?: ILoadMoreItem) => {
    if (!item) return;
    loadAllTreeDataEvent.fire(item.viewId);
};

const viewHistoryCmd = (item?: GitFolderItem) => {
    let uri = item ? vscode.Uri.file(item.path) : folderRoot.uri;
    uri && GitHistory.openHistory(uri);
};

export class CommandsManger {
    static register(context: vscode.ExtensionContext) {
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
            vscode.commands.registerCommand(Commands.copyFilePath, copyFilePathCmd),
            vscode.commands.registerCommand(Commands.refreshRecentFolder, refreshRecentFolderCmd),
            vscode.commands.registerCommand(Commands.openRecent, openRecentCmd),
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
        );
    }
}
