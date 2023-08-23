import * as vscode from 'vscode';
import { updateTreeDataEvent } from './events';
import { getFolderIcon, getWorkTreeList } from './utils';
import { Commands } from './constants';

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

export class CommandsManger {
    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            // TODO 挑选分支，新建worktree
            // TODO 保存git仓库引用地址
            // TODO 展示所有已存在的git worktree
            vscode.commands.registerCommand(Commands.freshTree, refreshWorkTreeCmd),
            vscode.commands.registerCommand(Commands.switchWorkTree, switchWorkTreeCmd),
        );
    }
}