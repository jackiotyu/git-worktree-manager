import * as vscode from 'vscode';
import { updateTreeDataEvent, updateFolderEvent } from '@/lib/events';
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
    pruneWorkTree,
    checkGitValid,
    openWindowsTerminal,
    addToWorkspace,
} from '@/utils';
import { pickBranch } from '@/lib/quickPick';
import { confirmModal } from '@/lib/modal';
import { Commands, APP_NAME, FolderItemConfig } from '@/constants';
import folderRoot from '@/lib/folderRoot';
import { WorkTreeItem, GitFolderItem } from '@/lib/treeView';
import { GlobalState } from '@/lib/globalState';
import * as util from 'util';
import path from 'path';

interface CmdItem extends vscode.QuickPickItem {
    use?: 'close';
}

export const switchWorkTreeCmd = () => {
    let workTrees = getWorkTreeList();
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

const removeWorkTreeCmd = async (item: WorkTreeItem) => {
    try {
        const confirm = await confirmModal(
            localize('msg.modal.title.deleteWorkTree'),
            localize('msg.modal.detail.deleteWorkTree', item.path),
        );
        if (!confirm) {
            return;
        }
        removeWorkTree(item.path, item.parent?.path);
        vscode.window.showInformationMessage(localize('msg.success.deleteWorkTree', item.path));
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.deleteWorkTree', String(error)));
    }
    updateTreeDataEvent.fire();
};

const addWorkTreeFromBranchCmd = async (item: WorkTreeItem) => {
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

const revealInSystemExplorerCmd = (item: WorkTreeItem | GitFolderItem) => {
    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.path));
};

const commonWorkTreeCmd = (path: string, cmd: Commands, cwd?: string) => {
    let cmdName = localize('operation');
    try {
        switch (cmd) {
            case Commands.lockWorkTree:
                lockWorkTree(path, cwd);
                cmdName = localize('lock');
                break;
            case Commands.unlockWorkTree:
                unlockWorkTree(path, cwd);
                cmdName = localize('unlock');
                break;
            case Commands.repairWorkTree:
                repairWorkTree(path, cwd);
                cmdName = localize('repair');
                break;
        }
        vscode.window.showInformationMessage(localize('msg.success.commonAction', cmdName));
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.commonAction', cmdName, util.inspect(error, false, 1, true)));
    }
    updateTreeDataEvent.fire();
};

const repairWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.repairWorkTree, item.parent?.path);
};

const lockWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.lockWorkTree, item.parent?.path);
};

const unlockWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.unlockWorkTree, item.parent?.path);
};

const moveWorkTreeCmd = async (item: WorkTreeItem) => {
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
        moveWorkTree(item.path, folderUri.fsPath, item.parent?.path);
        vscode.window.showInformationMessage(localize('msg.success.moveWorkTree'));
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.moveWorkTree', String(error)));
    }
    updateTreeDataEvent.fire();
};

const switchToSelectWorkTreeCmd = async (item: WorkTreeItem) => {
    try {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.path), {
            forceNewWindow: false,
        });
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.switchWorkTree', String(error)));
    }
};

const pruneWorkTreeCmd = async () => {
    try {
        let output = pruneWorkTree(true);
        if (!output?.length) {
            return;
        }
        let ok = localize('ok');
        let confirm = await vscode.window.showInformationMessage(
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
        pruneWorkTree();
        vscode.window.showInformationMessage(localize('msg.success.pruneWorkTree'));
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.pruneWorkTree'));
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

function updateFolderConfig(value: FolderItemConfig[]) {
    return GlobalState.update('gitFolders', value);
}

const addGitFolderCmd = async () => {
    let existFolders = getFolderConfig();
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
    if (!(await checkGitValid(folderPath))) {
        return vscode.window.showErrorMessage(localize('msg.error.invalidGitFolder'));
    }
    const worktreeList = getWorkTreeList(folderPath);
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
        return vscode.window.showErrorMessage(localize('msg.error.gitFolderExistInSetting'));
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
    vscode.window.showInformationMessage(localize('msg.success.save'));
};

const refreshGitFolderCmd = () => {
    updateFolderEvent.fire();
};

const pickFolderConfig = (item: GitFolderItem) => {
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
    vscode.window.showInformationMessage(localize('msg.success.remove'));
};

const renameGitFolderCmd = async (item: GitFolderItem) => {
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
        vscode.window.showInformationMessage(localize('msg.success.save'));
    }
};

const openWalkthroughsCmd = () => {
    vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'jackiotyu.git-worktree-manager#git-worktree-usage',
        false,
    );
};

const openTerminalCmd = async (item: WorkTreeItem | GitFolderItem) => {
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
    if (cmdList.length > 1) {
        const items: CmdItem[] = cmdList.map((text) => {
            return {
                label: text,
                iconPath: new vscode.ThemeIcon('terminal-bash'),
            };
        });
        items.push(
            {
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
            },
            {
                label: localize('close'),
                iconPath: new vscode.ThemeIcon('close-all'),
                use: 'close',
            },
        );
        let item = await await vscode.window.showQuickPick(items, {
            title: localize('msg.modal.title.selectCmd'),
            placeHolder: localize('msg.modal.placeholder.selectCmd'),
            canPickMany: false,
        });
        cmdText = item && item.use !== 'close' ? item.label : '';
    }
    // FIXME delay for prevent terminal dirty data
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    cmdText && terminal.sendText(cmdText, true);
};

const openWindowsTerminalCmd = (item: WorkTreeItem | GitFolderItem) => {
    try {
        openWindowsTerminal(`${item.path}`);
    } catch (error) {
        vscode.window.showErrorMessage(localize('msg.fail.invokeWindowsTerminal', String(error)));
    }
};

const addToWorkspaceCmd = (item: WorkTreeItem) => {
    return addToWorkspace(item.path);
};

const copyFilePathCmd = (item: WorkTreeItem | GitFolderItem) => {
    vscode.env.clipboard.writeText(item.path).then(() => {
        vscode.window.showInformationMessage(localize('msg.success.copy', item.path));
    });
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
            vscode.commands.registerCommand(Commands.switchToSelectWorkTree, switchToSelectWorkTreeCmd),
            vscode.commands.registerCommand(Commands.addWorkTreeFromBranch, addWorkTreeFromBranchCmd),
            vscode.commands.registerCommand(Commands.revealInSystemExplorer, revealInSystemExplorerCmd),
            vscode.commands.registerCommand(Commands.pruneWorkTree, pruneWorkTreeCmd),
            vscode.commands.registerCommand(Commands.openSetting, openSettingCmd),
            vscode.commands.registerCommand(Commands.addGitFolder, addGitFolderCmd),
            vscode.commands.registerCommand(Commands.refreshGitFolder, refreshGitFolderCmd),
            vscode.commands.registerCommand(Commands.removeGitFolder, removeGitFolderCmd),
            vscode.commands.registerCommand(Commands.renameGitFolder, renameGitFolderCmd),
            vscode.commands.registerCommand(Commands.openWalkthroughs, openWalkthroughsCmd),
            vscode.commands.registerCommand(Commands.openTerminal, openTerminalCmd),
            vscode.commands.registerCommand(Commands.openWindowsTerminal, openWindowsTerminalCmd),
            vscode.commands.registerCommand(Commands.addToWorkspace, addToWorkspaceCmd),
            vscode.commands.registerCommand(Commands.copyFilePath, copyFilePathCmd),
        );
    }
}
