import * as vscode from 'vscode';
import { getBranchList, formatTime } from '@/utils';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async () => {
    let resolve: (value?: any) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorkTree | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const branchList = getBranchList(['refname:short', 'objectname:short', 'worktreepath', 'authordate', 'HEAD']);
        if(!branchList) {return;}

        const quickPick = vscode.window.createQuickPick();
        // quickPick.title = 'Create Worktree for';
        quickPick.title = '创建 Worktree';
        // quickPick.placeholder = 'Choose a branch to create new worktree for';
        quickPick.placeholder = '选择用来创建 worktree 的分支';
        const branchItem: BranchForWorkTree[] = branchList.filter(i => !i.worktreepath).map(item => {
            return {
                label: item['refname:short'],
                description: `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(item.authordate)}`,
                iconPath: new vscode.ThemeIcon('source-control'),
                hash: item['objectname:short'],
                branch: item['refname:short']
            };
        });
        const defaultBranch = branchList.find(i => i.HEAD === '*');
        const defaultBranchItem: BranchForWorkTree[] = [
            {
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            },
            {
                label: defaultBranch?.['refname:short'] || '',
                description: `使用当前分支创建 worktree`,
                iconPath: new vscode.ThemeIcon('source-control'),
                hash: defaultBranch?.['objectname:short'],
            }
        ];
        quickPick.items = [...branchItem, ...defaultBranchItem];
        quickPick.canSelectMany = false;
        quickPick.onDidAccept(() => {
            quickPick.hide();
            resolve(quickPick.selectedItems[0]);
        });
        quickPick.onDidHide(() => resolve());
        quickPick.show();
        return await waiting;
    } catch (error) {
        console.log('pickBranch error ', error);
        reject(error);
    }
};
