import * as vscode from 'vscode';
import { formatTime, getWorkTreeList, checkGitValid, getAllRefList, judgeIsCurrentFolder } from '@/utils';
import { GlobalState } from '@/lib/globalState';
import { IWorkTreeCacheItem } from '@/types';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/lib/adaptor/window';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async (
    title: string = vscode.l10n.t('Create Worktree for'),
    placeholder: string = vscode.l10n.t('Choose a branch to create new worktree for'),
    cwd?: string,
): Promise<BranchForWorkTree | void> => {
    let resolve: (value?: BranchForWorkTree | void) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorkTree | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
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
        quickPick.onDidAccept(() => {
            resolve(quickPick.selectedItems[0]);
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            resolve();
            quickPick.dispose();
        });
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
        const branchItems: BranchForWorkTree[] = [
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
        const worktreeBranchItems: BranchForWorkTree[] = [
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

        const remoteBranchItems: BranchForWorkTree[] = [
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

        const tagItems: BranchForWorkTree[] = [
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

interface WorkTreePick extends vscode.QuickPickItem {
    path?: string;
}

const mapWorkTreePickItems = (list: IWorkTreeCacheItem[]): WorkTreePick[] => {
    let items = list.map((row) => {
        return {
            label: row.name,
            detail: `${row.path}`,
            description: `⇄ ${row.label}`,
            path: row.path,
            key: row.label,
            iconPath: judgeIsCurrentFolder(row.path) ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('repo'),
            buttons: [
                {
                    iconPath: new vscode.ThemeIcon('arrow-right'),
                    tooltip: vscode.l10n.t('Switch the current window to this folder.'),
                },
            ],
        };
    });
    let groupMap = groupBy(items, 'key');
    return Object.keys(groupMap).reduce<WorkTreePick[]>((list, key) => {
        list.push(...groupMap[key]);
        list.push({ kind: vscode.QuickPickItemKind.Separator, label: '' });
        return list;
    }, []);
};

export const pickWorktree = async () => {
    let resolve: (value?: any) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<WorkTreePick | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        let list: IWorkTreeCacheItem[] = [];
        const quickPick = vscode.window.createQuickPick<WorkTreePick>();
        quickPick.placeholder = vscode.l10n.t('Select to open in new window');
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.keepScrollPosition = true;
        const sortByNameTips = vscode.l10n.t('Sort by branch name');
        const sortByRepoTips = vscode.l10n.t('Sort by repository');
        const baseButtons: vscode.QuickInputButton[] = [
            { iconPath: new vscode.ThemeIcon('case-sensitive'), tooltip: sortByNameTips },
        ];
        const resetButtons: vscode.QuickInputButton[] = [
            { iconPath: new vscode.ThemeIcon('list-flat'), tooltip: sortByRepoTips },
        ];
        quickPick.buttons = baseButtons;
        quickPick.onDidTriggerButton((event) => {
            if (event.tooltip === sortByNameTips) {
                quickPick.items = [...quickPick.items]
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
                quickPick.buttons = resetButtons;
                return;
            }
            if (event.tooltip === sortByRepoTips) {
                quickPick.items = mapWorkTreePickItems(list);
                quickPick.buttons = baseButtons;
                return;
            }
        });
        quickPick.onDidTriggerItemButton((event) => {
            let selectedItem = event.item;
            if (!selectedItem.path) {
                return;
            }
            if (event.button.tooltip === vscode.l10n.t('Switch the current window to this folder.')) {
                if (selectedItem) {
                    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), {
                        forceNewWindow: false,
                        forceReuseWindow: true,
                    });
                }
                resolve(selectedItem);
            }
        });
        quickPick.onDidAccept(() => {
            let selectedItem = quickPick.selectedItems[0];
            if (selectedItem?.path) {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), {
                    forceNewWindow: true,
                });
            }
            resolve(selectedItem);
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            resolve();
            quickPick.dispose();
        });
        quickPick.busy = true;
        quickPick.show();
        list = GlobalState.get('workTreeCache', []);
        quickPick.items = mapWorkTreePickItems(list);
        // 先展示出缓存的数据
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const gitFolders = GlobalState.get('gitFolders', []);
        const worktreeList = await Promise.all(
            gitFolders.map(async (item) => {
                const list = await getWorkTreeList(item.path, true);
                return [list, item] as const;
            }),
        );
        list = worktreeList
            .map(([list, config]) => {
                return list.map<IWorkTreeCacheItem>((row) => {
                    return { ...row, label: config.name };
                });
            })
            .flat();
        // 添加缓存
        GlobalState.update('workTreeCache', list);
        const items: WorkTreePick[] = mapWorkTreePickItems(list);
        quickPick.items = items;
        quickPick.busy = false;

        return waiting;
    } catch {
        reject();
    }
};
