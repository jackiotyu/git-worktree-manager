import * as vscode from 'vscode';
import { getBranchList, getRemoteBranchList, getTagList, formatTime } from '@/utils';
import localize from '@/localize';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async (
    title: string = localize('msg.info.createWorkTree'),
    placeholder: string = localize('msg.placeholder.createWorkTree'),
    cwd?: string
) => {
    let resolve: (value?: any) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorkTree | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = title;
        quickPick.placeholder = placeholder;
        quickPick.canSelectMany = false;
        quickPick.onDidAccept(() => {
            resolve(quickPick.selectedItems[0]);
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            resolve();
            quickPick.dispose();
        });
        quickPick.show();
        quickPick.busy = true;

        const [branchList, remoteBranchList, tagList] = await Promise.resolve().then(() => {
            return Promise.all([
                getBranchList(['refname:short', 'objectname:short', 'worktreepath', 'authordate', 'HEAD'], cwd),
                getRemoteBranchList(['refname:short', 'objectname:short'], cwd),
                getTagList(['refname:short', 'objectname:short'], cwd),
            ]);
        });

        if (!branchList) {
            quickPick.hide();
            return;
        }

        const branchItems: BranchForWorkTree[] = branchList
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
        const defaultBranchItems: BranchForWorkTree[] = [
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
            // worktree branch list
            ...branchList
                .filter((i) => i.worktreepath)
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
                }),
            {
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
            },
        ];

        const remoteBranchItems: BranchForWorkTree[] = remoteBranchList.map((item) => {
            return {
                label: item['refname:short'],
                iconPath: new vscode.ThemeIcon('cloud'),
                description: item['objectname:short'],
                hash: item['objectname:short'],
            };
        });

        const tagItems: BranchForWorkTree[] = tagList.map((item) => {
            return {
                label: item['refname:short'],
                iconPath: new vscode.ThemeIcon('tag'),
                description: item['objectname:short'],
                hash: item['objectname:short'],
            };
        });

        quickPick.items = [...defaultBranchItems, ...branchItems, ...remoteBranchItems, ...tagItems];

        quickPick.busy = false;

        return await waiting;
    } catch (error) {
        console.log('pickBranch error ', error);
        reject(error);
    }
};
