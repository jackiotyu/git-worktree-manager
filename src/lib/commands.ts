import * as vscode from 'vscode';
import { updateTreeDataEvent, updateFolderEvent } from '@/lib/events';
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
} from '@/utils';
import { pickBranch } from '@/lib/quickPick';
import { confirmModal } from '@/lib/modal';
import { Commands, APP_NAME, FolderItemConfig } from '@/constants';
import folderRoot from '@/lib/folderRoot';
import { WorkTreeItem } from './treeView';
import * as util from 'util';

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
        placeHolder: '请选择切换的目录',
        title: 'worktree切换',
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
    let confirmCreate = await confirmModal('创建worktree', `将在 ${folderPath} 下创建${label}为 ${name} 的 worktree`);
    if (!confirmCreate) {
        return;
    }
    let created = await addWorkTree(folderPath, name || '');
    if (!created) {
        return;
    }
    updateTreeDataEvent.fire();
    let confirmOpen = await confirmModal('打开目录', `是否在新窗口打开新建的worktree?`);
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
        openLabel: '选择目录',
        title: '请选择需要创建worktree的目录',
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    let label = branch ? '分支' : '提交hash';
    await createWorkTreeFromInfo({
        name: branch || hash || '',
        label,
        folderPath,
    });
};

const removeWorkTreeCmd = async (item: WorkTreeItem) => {
    try {
        const confirm = await confirmModal('删除worktree', `将删除 ${item.path} 目录的worktree`);
        if (!confirm) {
            return;
        }
        removeWorkTree(item.path);
        updateTreeDataEvent.fire();
        vscode.window.showInformationMessage(`成功删除 ${item.path} 目录的 worktree`);
    } catch (error) {
        vscode.window.showErrorMessage(`worktree 移除失败\n\n ${util.inspect(error)}`);
    }
};

const addWorkTreeFromBranchCmd = async (item: WorkTreeItem) => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: '选择目录',
        title: '请选择需要创建worktree的目录',
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

const revealInSystemExplorerCmd = (item: WorkTreeItem) => {
    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.path));
};

const commonWorkTreeCmd = (path: string, cmd: Commands) => {
    let cmdName = '操作';
    try {
        switch (cmd) {
            case Commands.lockWorkTree:
                lockWorkTree(path);
                cmdName = '锁定';
                break;
            case Commands.unlockWorkTree:
                unlockWorkTree(path);
                cmdName = '解锁';
                break;
            case Commands.repairWorkTree:
                repairWorkTree(path);
                cmdName = '修复';
                break;
        }
        vscode.window.showInformationMessage(`worktree ${cmdName}成功`);
        updateTreeDataEvent.fire();
    } catch (error) {
        vscode.window.showErrorMessage(`worktree ${cmdName}失败 ${util.inspect(error, false, 1, true)}`);
    }
};

const repairWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.repairWorkTree);
};

const lockWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.lockWorkTree);
};

const unlockWorkTreeCmd = (item: WorkTreeItem) => {
    commonWorkTreeCmd(item.path, Commands.unlockWorkTree);
};

const moveWorkTreeCmd = async (item: WorkTreeItem) => {
    try {
        let uriList = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: folderRoot.uri,
            openLabel: '选择目录',
            title: `请选择将 worktree 的目录从 ${item.path} 移动到的新位置`,
        });
        if (!uriList?.length) {
            return;
        }
        let folderUri = uriList[0];
        moveWorkTree(item.path, folderUri.fsPath);
        updateTreeDataEvent.fire();
        vscode.window.showInformationMessage(`worktree 移动成功`);
    } catch (error) {
        vscode.window.showErrorMessage(`worktree 移动失败 \n\n ${util.inspect(error)}`);
    }
};

const switchToSelectWorkTreeCmd = async (item: WorkTreeItem) => {
    try {
        let pending = vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(item.path), {
            forceNewWindow: false,
        });
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                cancellable: true,
                title: '切换窗口中',
            },
            (progress) => {
                return Promise.resolve(pending).finally(() => {
                    progress.report({ increment: 100 });
                });
            },
        );
    } catch (error) {
        vscode.window.showErrorMessage(`切换 worktree 失败 \n\n ${util.inspect(error)}`);
    }
};

const pruneWorkTreeCmd = async () => {
    try {
        let output = pruneWorkTree(true);
        if (!output?.length) {
            return;
        }
        let ok = '确定';
        let confirm = await vscode.window.showInformationMessage(
            '将删除以下 worktree 目录',
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
        updateTreeDataEvent.fire();
        vscode.window.showInformationMessage('清理 worktree 成功');
    } catch (error) {
        vscode.window.showErrorMessage(`清理 worktree 失败 \n\n ${error}`);
    }
};

function openSettingCmd() {
    void vscode.commands.executeCommand('workbench.action.openSettings', `@ext:jackiotyu.git-worktree-manager`);
}

function getFolderConfig() {
    return vscode.workspace.getConfiguration(APP_NAME).get<FolderItemConfig[]>('gitFolders') || [];
}

function updateFolderConfig(value: FolderItemConfig[]) {
    return vscode.workspace.getConfiguration(APP_NAME).update('gitFolders', value, true);
}

const addGitFolderCmd = async () => {
    let existFolders = getFolderConfig();
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri,
        openLabel: '添加git仓库',
        title: '请选择git仓库目录',
    });
    if (!uriList?.length) {
        return;
    }
    let folderUri = uriList[0];
    if(!(await checkGitValid(folderUri.fsPath))) {
        return vscode.window.showErrorMessage('该目录不是可用的git仓库');
    }
    if (existFolders.some((i) => i.path === folderUri.fsPath)) {
        return vscode.window.showErrorMessage('git仓库目录在设置中已存在');
    }
    let folderName = await vscode.window.showInputBox({
        title: '输入展示用的仓库名称',
        placeHolder: '请输入展示用的名称',
        value: folderUri.fsPath,
        validateInput: (value) => {
            if(!value) {
                return '请输入展示用的名称';
            }
        },
    });
    if (!folderName) {
        return;
    }
    existFolders.push({ name: folderName, path: folderUri.fsPath });
    await updateFolderConfig(existFolders);
    vscode.window.showInformationMessage('保存成功');
};

const freshGitFolderCmd = () => {
    updateFolderEvent.fire();
};

export class CommandsManger {
    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            // TODO 保存git仓库引用地址
            // TODO 展示所有已存在的git worktree
            vscode.commands.registerCommand(Commands.freshTree, refreshWorkTreeCmd),
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
            vscode.commands.registerCommand(Commands.freshGitFolder, freshGitFolderCmd),
        );
    }
}
