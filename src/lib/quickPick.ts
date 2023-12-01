import * as vscode from 'vscode';
import { formatTime, getWorkTreeList, checkGitValid, getAllRefList, judgeIncludeFolder } from '@/utils';
import { GlobalState } from '@/lib/globalState';
import { IWorkTreeCacheItem } from '@/types';
import { Commands, APP_NAME } from '@/constants';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/lib/adaptor/window';
import folderRoot from '@/lib/folderRoot';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

const openInNewWindowQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('arrow-right'),
    tooltip: vscode.l10n.t('Switch the current window to this folder.'),
};

const revealInSystemExplorerQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('folder-opened'),
    tooltip: vscode.l10n.t('Reveal in the system explorer'),
};

const openExternalTerminalQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('terminal-bash'),
    tooltip: vscode.l10n.t('Open in External Terminal'),
};

const openTerminalQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('terminal'),
    tooltip: vscode.l10n.t('Open in VSCode built-in Terminal'),
};

const addToWorkspaceQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('multiple-windows'),
    tooltip: vscode.l10n.t('Add to workspace'),
};

const sortByBranchQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('case-sensitive'),
    tooltip: vscode.l10n.t('Sort by branch name'),
};

const sortByRepoQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('list-flat'),
    tooltip: vscode.l10n.t('Sort by repository'),
};

const settingQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('gear'),
    tooltip: vscode.l10n.t('Open Settings'),
};

const addWorktreeQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('add'),
    tooltip: vscode.l10n.t('Add a git repository folder path'),
};

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
    // 是否置顶当前仓库的分支
    const pinCurRepo = vscode.workspace
        .getConfiguration(APP_NAME)
        .get<boolean>('worktreePick.pinCurrentRepo', false);
    let items = list.map((row) => {
        const isCurrent = judgeIncludeFolder(row.path);
        const buttons: vscode.QuickInputButton[] = [
            openExternalTerminalQuickInputButton,
            openTerminalQuickInputButton,
            revealInSystemExplorerQuickInputButton,
        ];
        if (!isCurrent) buttons.push(addToWorkspaceQuickInputButton);
        buttons.push(openInNewWindowQuickInputButton);
        return {
            label: row.name,
            detail: `${row.path}`,
            description: `⇄ ${row.label}`,
            path: row.path,
            key: row.label,
            iconPath: isCurrent ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('window'),
            buttons: buttons,
        };
    });
    let groupMap = groupBy(items, 'key');
    let pathSize = folderRoot.folderPathSet.size;
    return Object.keys(groupMap).reduce<WorkTreePick[]>((list, key) => {
        if (pinCurRepo && pathSize && groupMap[key].some((item) => judgeIncludeFolder(item.path))) {
            list.unshift({ kind: vscode.QuickPickItemKind.Separator, label: '' });
            list.unshift(...groupMap[key]);
            pathSize--;
        } else {
            list.push(...groupMap[key]);
            list.push({ kind: vscode.QuickPickItemKind.Separator, label: '' });
        }
        return list;
    }, []);
};

export const pickWorktree = async () => {
    const worktreeButtons = [addWorktreeQuickInputButton, settingQuickInputButton, sortByBranchQuickInputButton];

    const exchangeButton = (
        btn1: vscode.QuickInputButton,
        btn2: vscode.QuickInputButton,
    ): vscode.QuickInputButton[] => {
        const index = worktreeButtons.findIndex((btn) => btn === btn1);
        if (~~index) worktreeButtons[index] = btn2;
        return worktreeButtons;
    };

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
        quickPick.buttons = worktreeButtons;
        quickPick.onDidTriggerButton((event) => {
            if (event === sortByBranchQuickInputButton) {
                quickPick.items = [...quickPick.items]
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
                quickPick.buttons = exchangeButton(sortByBranchQuickInputButton, sortByRepoQuickInputButton);
                return;
            }
            if (event === sortByRepoQuickInputButton) {
                quickPick.items = mapWorkTreePickItems(list);
                quickPick.buttons = exchangeButton(sortByRepoQuickInputButton, sortByBranchQuickInputButton);
                return;
            }
            if (event === settingQuickInputButton) {
                vscode.commands.executeCommand(Commands.openSetting);
                quickPick.hide();
                return;
            }
            if (event === addWorktreeQuickInputButton) {
                vscode.commands.executeCommand(Commands.addGitFolder);
                return;
            }
        });
        quickPick.onDidTriggerItemButton((event) => {
            const selectedItem = event.item;
            const button = event.button;
            if (!selectedItem.path) {
                return;
            }
            const vieItem = {
                name: selectedItem.label,
                path: selectedItem.path,
            };
            switch (button) {
                case openInNewWindowQuickInputButton:
                    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), {
                        forceNewWindow: false,
                        forceReuseWindow: true,
                    });
                    break;
                case openExternalTerminalQuickInputButton:
                    vscode.commands.executeCommand(Commands.openExternalTerminal, vieItem);
                    break;
                case openTerminalQuickInputButton:
                    vscode.commands.executeCommand(Commands.openTerminal, vieItem);
                    break;
                case revealInSystemExplorerQuickInputButton:
                    vscode.commands.executeCommand(Commands.revealInSystemExplorer, vieItem);
                    break;
                case addToWorkspaceQuickInputButton:
                    quickPick.hide();
                    vscode.commands.executeCommand(Commands.addToWorkspace, vieItem);
                    break;
            }
            resolve(selectedItem);
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
