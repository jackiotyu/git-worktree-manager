import * as vscode from 'vscode';
import {
    updateTreeDataEvent,
    updateFolderEvent,
    updateRecentEvent,
    toggleGitFolderViewAsEvent,
    loadAllTreeDataEvent,
    revealTreeItemEvent,
} from '@/lib/events';
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
    removeFromWorkspace,
    checkExist,
    getNameRev,
    getMainFolder,
    comparePath,
    pickGitFolder,
    toSimplePath,
    revealFolderInOS,
} from '@/utils';
import { pickBranch, pickWorktree } from '@/lib/quickPick';
import { confirmModal } from '@/lib/modal';
import { Commands, APP_NAME } from '@/constants';
import folderRoot from '@/lib/folderRoot';
import type { WorkTreeItem, GitFolderItem, FolderItem, AllViewItem } from '@/lib/treeItem';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import * as util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { Alert } from '@/lib/adaptor/window';
import { GitHistory } from '@/lib/adaptor/gitHistory';
import { ILoadMoreItem, IFolderItemConfig, IWorktreeLess } from '@/types';
import { actionProgressWrapper } from '@/lib/progress';
import logger from '@/lib/logger';
import { worktreeEventRegister } from '@/lib/gitEvent';

interface CmdItem extends vscode.QuickPickItem {
    use?: 'close';
}

const checkFolderExist = async (path: string) => {
    let exist = await checkExist(path);
    if (!exist) {
        Alert.showErrorMessage(vscode.l10n.t('The folder does not exist'), { modal: true });
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
        placeHolder: vscode.l10n.t('Please select the directory to switch'),
        title: vscode.l10n.t('Worktree switch'),
        matchOnDetail: true,
        matchOnDescription: true,
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

const createWorkTreeFromInfo = async (info: {
    folderPath: string;
    name: string;
    label: string;
    isBranch: boolean;
    cwd?: string;
}) => {
    const { folderPath, name, label, isBranch, cwd } = info;
    let confirmCreate = await confirmModal(
        vscode.l10n.t('Create worktree'),
        vscode.l10n.t('A worktree with {1} {2} is created under {0}', folderPath, label, name),
    );
    if (!confirmCreate) {
        return;
    }
    let created = await addWorkTree(folderPath, name, isBranch, cwd);
    if (!created) {
        return;
    }
    let confirmOpen = await confirmModal(
        vscode.l10n.t('Open folder'),
        vscode.l10n.t('Whether to open the new worktree in a new window?'),
    );
    if (!confirmOpen) {
        return;
    }
    let folderUri = vscode.Uri.file(folderPath);
    vscode.commands.executeCommand('vscode.openFolder', folderUri, {
        forceNewWindow: true,
    });
};

export const addWorkTreeCmd = async (item?: IWorktreeLess) => {
    let gitFolder = item?.path || (await pickGitFolder());
    if (gitFolder === null) Alert.showErrorMessage(vscode.l10n.t('Please open a git repository in workspace'));
    if (!gitFolder) return false;
    let branchItem = await pickBranch(
        vscode.l10n.t('Create Worktree ({0})', gitFolder.length > 35 ? `...${gitFolder.slice(-34)}` : gitFolder),
        vscode.l10n.t('Choose a branch to create new worktree for'),
        gitFolder,
    );
    // FIXME 改造quickPick
    if (branchItem === void 0) return;
    if (!branchItem) return false;
    let { branch, hash } = branchItem;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(gitFolder),
        openLabel: vscode.l10n.t('Select the folder'),
        title: vscode.l10n.t('Select the folder where you want to create the worktree?'),
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    let label = branch ? vscode.l10n.t('branch') : vscode.l10n.t('commit hash');
    await createWorkTreeFromInfo({
        name: branch || hash || '',
        label,
        folderPath,
        isBranch: !!branch,
        cwd: gitFolder,
    });
};

const removeWorkTreeCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        const confirm = await confirmModal(
            vscode.l10n.t('Delete worktree'),
            vscode.l10n.t('The worktree for the {0} folder will be deleted', item.path),
        );
        if (!confirm) {
            return;
        }
        await removeWorkTree(item.path, item.parent?.path);
        Alert.showInformationMessage(vscode.l10n.t('Successfully deleted the worktree for the {0} folder', item.path));
        vscode.commands.executeCommand(Commands.refreshWorkTree);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree removal failed\n\n {0}', String(error)));
        logger.error(error);
    }
};

const addWorkTreeFromBranchCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: vscode.l10n.t('Select the folder'),
        title: vscode.l10n.t('Select the folder where you want to create the worktree?'),
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
        isBranch: !!item.isBranch,
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
    const openInsideFolder = vscode.workspace.getConfiguration(APP_NAME).get<boolean>('openInsideFolder', false);
    if(openInsideFolder) revealFolderInOS(path.resolve(item.path));
    else vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.path));
};

const commonWorkTreeCmd = async (path: string, cmd: Commands, cwd?: string) => {
    let cmdName = vscode.l10n.t('operation');
    try {
        switch (cmd) {
            case Commands.lockWorkTree:
                await lockWorkTree(path, cwd);
                cmdName = vscode.l10n.t('lock');
                break;
            case Commands.unlockWorkTree:
                await unlockWorkTree(path, cwd);
                cmdName = vscode.l10n.t('unlock');
                break;
            case Commands.repairWorkTree:
                await repairWorkTree(path, cwd);
                cmdName = vscode.l10n.t('repair');
                break;
        }
        Alert.showInformationMessage(vscode.l10n.t('Worktree {0} successfully', cmdName));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree {0} failed {1}', cmdName, util.inspect(error, false, 1, true)));
        logger.error(error);
    }
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
            defaultUri: vscode.Uri.file(path.dirname(item.path)),
            openLabel: vscode.l10n.t('Select the folder'),
            title: vscode.l10n.t(`Select the new location to move the Worktree's folder from {0}`, item.path),
        });
        if (!uriList?.length) {
            return;
        }
        let folderUri = uriList[0];
        await moveWorkTree(item.path, folderUri.fsPath, item.parent?.path);
        Alert.showInformationMessage(vscode.l10n.t('Worktree moved successfully'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Worktree move failed \n\n {0}', String(error)));
        logger.error(error);
    }
};

const switchToSelectFolderCmd = async (item?: WorkTreeItem) => {
    if (!item) return;
    try {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.path), {
            forceNewWindow: false,
            forceReuseWindow: true,
        });
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Switching worktree failed \n\n {0}', String(error)));
        logger.error(error);
    }
};

const pruneWorkTreeCmd = async () => {
    try {
        let output = await pruneWorkTree(true);
        if (!output?.length) {
            return;
        }
        let ok = vscode.l10n.t('ok');
        let confirm = await Alert.showInformationMessage(
            vscode.l10n.t('The following Worktree folder will be deleted'),
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
        Alert.showInformationMessage(vscode.l10n.t('Prune worktree succeeded'));
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to prune worktree'));
        logger.error(error);
    }
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
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
    }
}

const addToGitFolder = async (folderPath: string) => {
    if (!(await checkFolderExist(folderPath))) {
        return;
    }
    let existFolders = getFolderConfig();
    if (!(await checkGitValid(folderPath))) {
        return Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
    }
    folderPath = await getMainFolder(folderPath);
    if (existFolders.some((i) => comparePath(i.path, folderPath))) {
        return Alert.showErrorMessage(vscode.l10n.t('The git repository folder already exists in the settings'));
    }
    let folderName = await vscode.window.showInputBox({
        title: vscode.l10n.t('Enter the name of the repository for the showcase'),
        placeHolder: vscode.l10n.t('Please enter a name for the presentation'),
        value: folderPath,
        validateInput: (value) => {
            if (!value) {
                return vscode.l10n.t('Please enter a name for the presentation');
            }
        },
    });
    if (!folderName) {
        return;
    }
    existFolders.push({ name: folderName, path: folderPath });
    await updateFolderConfig(existFolders);
    worktreeEventRegister.add(vscode.Uri.file(folderPath));
    Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
};

const addMultiGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the root directory of multiple git repositories'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    const files = await fs
        .readdir(folderPath, { encoding: 'utf-8' })
        .then((files) => files.map((fileName) => path.join(folderPath, fileName)))
        .catch(() => []);
    if(!files.length) return;
    const folders = await Promise.all(
        files.map(async (filePath) => {
            try {
                return toSimplePath((await getMainFolder(filePath)));
            } catch {
                return null;
            }
        }),
    );
    const existFolders = getFolderConfig();
    const distinctFolders = [...new Set(folders)];
    const existFoldersMap = new Map(existFolders.map((i) => [toSimplePath(i.path), true]));
    const gitFolders = distinctFolders.filter((i) => i && !existFoldersMap.has(i)) as string[];
    if (!gitFolders.length) return;
    const options: vscode.QuickPickItem[] = gitFolders.map((folderPath) => ({ label: folderPath }));
    const selected = await vscode.window.showQuickPick(options, {
        canPickMany: true,
        title: vscode.l10n.t('Select folder(s)'),
    });
    if (!selected) return;
    const selectGitFolders = selected.map((item) => item.label);
    const newFolders = getFolderConfig();
    newFolders.push(...selectGitFolders.map((i) => ({ name: i, path: i })));
    await updateFolderConfig(newFolders);
    selectGitFolders.forEach((folderPath) => worktreeEventRegister.add(vscode.Uri.file(folderPath)));
    Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
};

const addSingleGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the git repository folder path'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    await addToGitFolder(folderPath);
};

const addGitFolderCmd = async () => {
    const multiLabel = vscode.l10n.t('Multiple repositories');
    const singleLabel = vscode.l10n.t('Single repository');
    let options: vscode.QuickPickItem[] = [
        { label: multiLabel, iconPath: new vscode.ThemeIcon('checklist') },
        { label: singleLabel, iconPath: new vscode.ThemeIcon('repo') }
    ];
    let selected = await vscode.window.showQuickPick(options, {
        canPickMany: false,
        title: vscode.l10n.t('Add git repository'),
    });
    if(!selected) return;
    if(selected.label === multiLabel) addMultiGitFolder();
    else addSingleGitFolder();
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
        vscode.l10n.t('Remove the git repository reference in list'),
        vscode.l10n.t(
            'Are you sure to delete this repository reference with path {0} and alias {1}?',
            item.path,
            item.name,
        ),
    );
    if (!ok) {
        return;
    }
    folders = folders.filter((f) => f.path !== path);
    await updateFolderConfig(folders);
    worktreeEventRegister.remove(vscode.Uri.file(path));
    Alert.showInformationMessage(vscode.l10n.t('Remove successfully'));
};

const renameGitFolderCmd = async (item?: GitFolderItem) => {
    if (!item) return;
    let folder = pickFolderConfig(item);
    if (!folder) {
        return;
    }
    const path = folder.path;
    let name = await vscode.window.showInputBox({
        title: vscode.l10n.t('Rename the git repository alias'),
        placeHolder: vscode.l10n.t('Enter the name of the repository for the showcase'),
        value: folder.name,
        validateInput(value) {
            if (!value) {
                return vscode.l10n.t('Enter the name of the repository for the showcase');
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
        Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
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
    if (!(await checkFolderExist(item.path))) return;
    const terminal = vscode.window.createTerminal({
        cwd: item.path,
        name: `${item.name} ⇄ ${item.path}`,
        iconPath: new vscode.ThemeIcon('terminal-bash'),
        isTransient: false,
        hideFromUser: false,
        location: getTerminalLocationConfig(),
    });
    terminal.show();
    const cmdList = getTerminalCmdListConfig();
    if (!cmdList.length) return;
    const watchOpenTerminal = vscode.window.onDidOpenTerminal(async t => {
        let [pid, currentPid] = await Promise.all([t.processId, terminal.processId]);
        if(pid !== currentPid) return;
        let cmdText = cmdList[0];
        watchOpenTerminal.dispose();
        // 单个
        if(cmdList.length <= 1) {
            cmdText && terminal.sendText(cmdText, true);
            return;
        }
        const close = () => {
            cancelToken.cancel();
            disposable.dispose();
        };
        // 多选
        let cancelToken = new vscode.CancellationTokenSource();
        let disposable = vscode.window.onDidCloseTerminal(async (t) => {
            if((await t.processId) !== currentPid) return;
            close();
        });
        const items: CmdItem[] = cmdList.map((text) => ({
            label: text,
            iconPath: new vscode.ThemeIcon('terminal-bash'),
        }));
        let item = await vscode.window.showQuickPick(
            items,
            {
                title: vscode.l10n.t('Select command'),
                placeHolder: vscode.l10n.t('Select the command you need to execute in the terminal'),
                canPickMany: false,
            },
            cancelToken.token,
        );
        close();
        cmdText = item && item.use !== 'close' ? item.label : '';
        cmdText && terminal.sendText(cmdText, true);
    });
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
        Alert.showErrorMessage(vscode.l10n.t('Opening External Terminal failed\n\n {0}', String(error)));
    }
};

const addToWorkspaceCmd = async (item: WorkTreeItem | FolderItem) => {
    if (!(await checkFolderExist(item.path))) {
        return;
    }
    return addToWorkspace(item.path);
};

const removeFromWorkspaceCmd = async (item: WorkTreeItem) => {
    return removeFromWorkspace(item.path);
};

const copyFolderPathCmd = (item?: IWorktreeLess) => {
    if (!item) return;
    vscode.env.clipboard.writeText(item.path).then(() => {
        Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', item.path));
    });
};

const refreshRecentFolderCmd = () => {
    updateRecentEvent.fire();
};

const addToGitFolderCmd = (item?: FolderItem) => {
    if (!item) return;
    return addToGitFolder(item.path);
};

const checkoutBranchCmd = async (item?: IWorktreeLess) => {
    let selectedItem: { name: string; path: string } | undefined = item;
    if (!item) {
        let isValidGit = await checkGitValid();
        if (!isValidGit) {
            Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
            return false;
        }
        selectedItem = {
            path: folderRoot.uri?.fsPath || '',
            name: (await getNameRev(folderRoot.uri?.fsPath || ''))
                .replace(/^tags\//, '')
                .replace(/^heads\//, '')
                .trim(),
        };
    }
    if (!selectedItem) return false;
    let branchItem = await pickBranch(
        vscode.l10n.t('Checkout branch ( {0} )', `${selectedItem.name} ⇄ ${selectedItem.path.length > 35 ? `...${selectedItem.path.slice(-34)}` : selectedItem.path}`),
        vscode.l10n.t('Select branch for checkout'),
        selectedItem.path,
    );
    // FIXME 改造quickPick
    if (branchItem === void 0) return;
    if (!branchItem) return false;
    const checkoutText = branchItem.branch || branchItem.hash || '';
    const isBranch = !!branchItem.branch;
    actionProgressWrapper(
        vscode.l10n.t('Checkout branch ( {0} ) on {1}', checkoutText, selectedItem.path),
        () => checkoutBranch(selectedItem!.path, checkoutText, isBranch),
        () => {},
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

const openRecentCmd = () => {
    vscode.commands.executeCommand('workbench.action.openRecent');
};

const watchWorktreeEventCmd = () => {
    // 手动打开监听
    queueMicrotask(() => {
        const folders = [
            ...new Set([
                ...WorkspaceState.get('mainFolders', []).map((i) => i.path),
                ...GlobalState.get('gitFolders', []).map((i) => i.path),
            ]),
        ];
        folders.forEach((folderPath) => {
            worktreeEventRegister.add(vscode.Uri.file(folderPath));
        });
    });
};

const unwatchWorktreeEventCmd = () => {
    worktreeEventRegister.dispose();
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
        );
    }
}
