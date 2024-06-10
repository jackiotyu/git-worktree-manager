import * as vscode from 'vscode';
import { formatTime } from '@/core/util/parse';
import { checkGitValid } from '@/core/git/checkGitValid';
import { getAllRefList } from '@/core/git/getAllRefList';
import { Alert } from '@/core/ui/message';
import { backButton } from './quickPick.button';

interface BranchForWorktree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async (
    title: string,
    placeholder: string,
    cwd?: string,
): Promise<BranchForWorktree | void | false> => {
    let resolve: (value: BranchForWorktree | void | false) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorktree | void | false>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    const disposables: vscode.Disposable[] = [];
    try {
        let isValidGit = await checkGitValid(cwd);
        if (!isValidGit) {
            Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
            return;
        }
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = title;
        quickPick.placeholder = placeholder;
        quickPick.canSelectMany = false;
        quickPick.buttons = [backButton];
        disposables.push(
            quickPick.onDidAccept(() => {
                resolve(quickPick.selectedItems[0]);
                quickPick.hide();
            }),
            quickPick.onDidHide(() => {
                resolve(false);
                disposables.forEach((i) => i.dispose());
                disposables.length = 0;
                quickPick.dispose();
            }),
            quickPick.onDidTriggerButton((event) => {
                if (event === backButton) {
                    resolve();
                    quickPick.hide();
                }
            }),
        );
        // TODO 按名称排序
        quickPick.show();
        quickPick.busy = true;
        // 使用 git for-each-ref 获取所有分支和tag
        const allRefList = await getAllRefList(
            ['refname', 'objectname:short', 'worktreepath', 'authordate', 'HEAD', 'refname:short'],
            cwd,
        );
        type RefList = typeof allRefList;
        let branchList: RefList = [];
        let remoteBranchList: RefList = [];
        let tagList: RefList = [];
        allRefList.forEach((item) => {
            if (item.refname.startsWith('refs/heads/')) {
                branchList.push(item);
            } else if (item.refname.startsWith('refs/remotes/') && !item.refname.endsWith('/HEAD')) {
                remoteBranchList.push(item);
            } else if (item.refname.startsWith('refs/tags/')) {
                tagList.push(item);
            }
        });
        if (!branchList) {
            quickPick.hide();
            return;
        }
        const branchItems: BranchForWorktree[] = [
            { label: vscode.l10n.t('branch'), kind: vscode.QuickPickItemKind.Separator },
            ...branchList
                .filter((i) => !i.worktreepath && i.HEAD !== '*')
                .map((item) => {
                    const shortRefName = item['refname'].replace('refs/heads/', '');
                    return {
                        label: shortRefName,
                        description: `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(
                            item.authordate,
                        )}`,
                        iconPath: new vscode.ThemeIcon('source-control'),
                        hash: item['objectname:short'],
                        branch: shortRefName,
                    };
                }),
        ];
        const defaultBranch = branchList.find((i) => i.HEAD === '*');
        const worktreeBranchItems: BranchForWorktree[] = [
            { label: 'worktree', kind: vscode.QuickPickItemKind.Separator },
            {
                label: `HEAD ${defaultBranch?.['objectname:short'] || ''}`,
                description: vscode.l10n.t('Current commit hash'),
                iconPath: new vscode.ThemeIcon('git-commit'),
                hash: defaultBranch?.['objectname:short'],
            },
            // worktree branch list
            ...branchList
                .filter((i) => i.worktreepath)
                .map((item) => {
                    const shortName = item['refname'].replace('refs/heads/', '');
                    return {
                        label: shortName,
                        description: `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(
                            item.authordate,
                        )}`,
                        iconPath:
                            item.HEAD === '*' ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('source-control'),
                        hash: item['objectname:short'],
                        branch: shortName,
                    };
                }),
        ];

        const remoteBranchItems: BranchForWorktree[] = [
            { label: vscode.l10n.t('remote branch'), kind: vscode.QuickPickItemKind.Separator },
            ...remoteBranchList.map((item) => {
                return {
                    label: item['refname:short'],
                    iconPath: new vscode.ThemeIcon('cloud'),
                    description: `${vscode.l10n.t('remote branch')} $(git-commit) ${
                        item['objectname:short']
                    } $(circle-small-filled) ${formatTime(item.authordate)}`,
                    branch: item['refname:short'],
                };
            }),
        ];

        const tagItems: BranchForWorktree[] = [
            { label: vscode.l10n.t('tag'), kind: vscode.QuickPickItemKind.Separator },
            ...tagList.map((item) => {
                return {
                    label: item['refname'].replace('refs/tags/', ''),
                    iconPath: new vscode.ThemeIcon('tag'),
                    description: `${vscode.l10n.t('tag')} $(git-commit) ${
                        item['objectname:short']
                    } $(circle-small-filled) ${formatTime(item.authordate)}`,
                    hash: item['objectname:short'],
                };
            }),
        ];

        quickPick.items = [...worktreeBranchItems, ...branchItems, ...remoteBranchItems, ...tagItems];
        quickPick.busy = false;

        return await waiting;
    } catch (error) {
        console.log('pickBranch error ', error);
        reject(error);
    }
};
