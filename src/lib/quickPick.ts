import * as vscode from 'vscode';
import { getBranchList, formatTime } from '@/utils';
import localize from '@/localize';

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
        if (!branchList) {
            return;
        }

        const quickPick = vscode.window.createQuickPick();
        quickPick.title = localize('msg.info.createWorkTree');
        quickPick.placeholder = localize('msg.placeholder.createWorkTree');
        const branchItem: BranchForWorkTree[] = branchList
            .filter((i) => !i.worktreepath)
            .map((item) => {
                return {
                    label: item['refname:short'],
                    description: `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(
                        item.authordate,
                    )}`,
                    iconPath: new vscode.ThemeIcon('source-control'),
                    hash: item['objectname:short'],
                    branch: item['refname:short'],
                };
            });
        const defaultBranch = branchList.find((i) => i.HEAD === '*');
        const defaultBranchItem: BranchForWorkTree[] = [
            {
                label: `HEAD ${defaultBranch?.['objectname:short'] || ''}`,
                description: localize('msg.pickItem.useCurrentBranch'),
                iconPath: new vscode.ThemeIcon('source-control'),
                hash: defaultBranch?.['objectname:short'],
            },
            {
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
            },
        ];
        quickPick.items = [...defaultBranchItem, ...branchItem];
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
