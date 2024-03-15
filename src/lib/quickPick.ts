import * as vscode from 'vscode';
import {
    formatTime,
    checkGitValid,
    getAllRefList,
    judgeIncludeFolder,
    getLashCommitDetail,
    updateWorkTreeCache,
    updateWorkspaceListCache,
} from '@/utils';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import { IWorkTreeCacheItem, DefaultDisplayList, IWorktreeLess } from '@/types';
import { Commands, QuickPickKind } from '@/constants';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/lib/adaptor/window';
import { Config } from '@/lib/adaptor/config';
import folderRoot from '@/lib/folderRoot';
import { updateTreeDataEvent, changeUIVisibleEvent } from '@/lib/events';
import path from 'path';
import {
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    revealInSystemExplorerQuickInputButton,
    copyItemQuickInputButton,
    addToWorkspaceQuickInputButton,
    removeFromWorkspaceQuickInputButton,
    openInNewWindowQuickInputButton,
    addGitRepoQuickInputButton,
    useWorkspaceWorktreeQuickInputButton,
    useAllWorktreeQuickInputButton,
    settingQuickInputButton,
    sortByBranchQuickInputButton,
    sortByRepoQuickInputButton,
    checkoutBranchQuickInputButton,
    backButton,
    addWorktreeQuickInputButton,
    moreQuickInputButton,
    viewHistoryQuickInputButton,
} from './quickPick.button';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async (
    title: string,
    placeholder: string,
    cwd?: string,
): Promise<BranchForWorkTree | void | false> => {
    let resolve: (value: BranchForWorkTree | void | false) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorkTree | void | false>((_resolve, _reject) => {
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
    const pinCurRepo = Config.get('worktreePick.pinCurrentRepo', false);
    const copyTemplate = Config.get('worktreePick.copyTemplate', '$LABEL');
    const copyTooltip = `${vscode.l10n.t('Copy')}: ${copyTemplate}`;

    const showExternalTerminal = Config.get('worktreePick.showExternalTerminal', false);
    const showTerminal = Config.get('worktreePick.showTerminal', false);
    const showRevealInSystemExplorer = Config.get('worktreePick.showRevealInSystemExplorer', false);
    const showCopy = Config.get('worktreePick.showCopy', false);
    const showAddToWorkspace = Config.get('worktreePick.showAddToWorkspace', false);
    const showCheckout = Config.get('worktreePick.showCheckout', true);
    const showViewHistory = Config.get('worktreePick.showViewHistory', true);

    let items = list.map((row) => {
        const isCurrent = judgeIncludeFolder(row.path);
        const list: { button: vscode.QuickInputButton; show: boolean }[] = [
            {
                button: openExternalTerminalQuickInputButton,
                show: showExternalTerminal,
            },
            {
                button: openTerminalQuickInputButton,
                show: showTerminal,
            },
            {
                button: revealInSystemExplorerQuickInputButton,
                show: showRevealInSystemExplorer,
            },
            {
                button: Object.assign(copyItemQuickInputButton, { tooltip: copyTooltip }),
                show: showCopy,
            },
            {
                button: checkoutBranchQuickInputButton,
                show: showCheckout,
            },
            {
                button: addToWorkspaceQuickInputButton,
                show: !isCurrent && showAddToWorkspace,
            },
            {
                button: removeFromWorkspaceQuickInputButton,
                show: isCurrent && showAddToWorkspace,
            },
            {
                button: viewHistoryQuickInputButton,
                show: showViewHistory,
            },
            {
                button: moreQuickInputButton,
                show: true,
            },
            {
                button: openInNewWindowQuickInputButton,
                show: true,
            },
        ];

        const buttons: vscode.QuickInputButton[] = list.filter((i) => i.show).map((i) => i.button);
        return {
            label: row.name,
            detail: `${row.path}`,
            description: `⇄ ${row.label}${row.isMain ? ' ✨' : ''}`,
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
    const disposables: vscode.Disposable[] = [];
    let checkList =
        Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.all) ===
        DefaultDisplayList.all;

    const worktreeButtons = [
        addGitRepoQuickInputButton,
        addWorktreeQuickInputButton,
        checkList ? useWorkspaceWorktreeQuickInputButton : useAllWorktreeQuickInputButton,
        settingQuickInputButton,
        sortByBranchQuickInputButton,
    ];

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
        let workspaceList: IWorkTreeCacheItem[] = [];
        let listLoading: boolean = true;
        let workspaceListLoading: boolean = true;
        let checkSortByBranch = false;
        let canClose = true;

        const updateList = () => {
            let items = checkList ? mapWorkTreePickItems(list) : mapWorkTreePickItems(workspaceList);
            const busy = checkList ? listLoading : workspaceListLoading;
            if (checkSortByBranch) {
                items = items
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
            }
            quickPick.busy = busy;
            quickPick.items = items;
        };

        const initList = () => {
            updateWorkspaceListCache().then(() => {
                workspaceList = WorkspaceState.get('workTreeCache', []);
                workspaceListLoading = false;
                updateList();
            });
            updateWorkTreeCache().then(() => {
                list = GlobalState.get('workTreeCache', []);
                listLoading = false;
                updateList();
            });
        };

        const initEvent: vscode.Disposable = updateTreeDataEvent.event(initList);

        const quickPick = vscode.window.createQuickPick<WorkTreePick>();
        quickPick.placeholder = vscode.l10n.t('Select to open in new window');
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.keepScrollPosition = true;
        quickPick.buttons = worktreeButtons;
        const onDidTriggerButton = quickPick.onDidTriggerButton((event) => {
            if (event === sortByBranchQuickInputButton) {
                checkSortByBranch = true;
                updateList();
                quickPick.buttons = exchangeButton(sortByBranchQuickInputButton, sortByRepoQuickInputButton);
                return;
            }
            if (event === sortByRepoQuickInputButton) {
                checkSortByBranch = false;
                updateList();
                quickPick.buttons = exchangeButton(sortByRepoQuickInputButton, sortByBranchQuickInputButton);
                return;
            }
            if (event === settingQuickInputButton) {
                vscode.commands.executeCommand(Commands.openSetting);
                quickPick.hide();
                return;
            }
            if (event === addGitRepoQuickInputButton) {
                vscode.commands.executeCommand(Commands.addGitFolder);
                return;
            }
            if (event === useAllWorktreeQuickInputButton) {
                checkList = true;
                updateList();
                quickPick.buttons = exchangeButton(
                    useAllWorktreeQuickInputButton,
                    useWorkspaceWorktreeQuickInputButton,
                );
                return;
            }
            if (event === useWorkspaceWorktreeQuickInputButton) {
                checkList = false;
                updateList();
                quickPick.buttons = exchangeButton(
                    useWorkspaceWorktreeQuickInputButton,
                    useAllWorktreeQuickInputButton,
                );
                return;
            }
            if (event === addWorktreeQuickInputButton) {
                // FIXME 改造quickPick
                canClose = false;
                vscode.commands.executeCommand(Commands.addWorkTree).then((res) => {
                    canClose = true;
                    if (res === false) {
                        quickPick.hide();
                    } else {
                        // 需要重新渲染列表数据
                        updateList();
                        quickPick.show();
                    }
                });
                quickPick.hide();
                return;
            }
        });
        const onDidTriggerItemButton = quickPick.onDidTriggerItemButton((event) => {
            const selectedItem = event.item;
            const button = event.button;
            if (!selectedItem.path) {
                return;
            }
            const viewItem: IWorktreeLess = {
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
                    vscode.commands.executeCommand(Commands.openExternalTerminalContext, viewItem);
                    break;
                case openTerminalQuickInputButton:
                    vscode.commands.executeCommand(Commands.openTerminal, viewItem);
                    break;
                case revealInSystemExplorerQuickInputButton:
                    vscode.commands.executeCommand(Commands.revealInSystemExplorerContext, viewItem);
                    break;
                case addToWorkspaceQuickInputButton:
                    quickPick.hide();
                    vscode.commands.executeCommand(Commands.addToWorkspace, viewItem);
                    break;
                case removeFromWorkspaceQuickInputButton:
                    quickPick.hide();
                    vscode.commands.executeCommand(Commands.removeFromWorkspace, viewItem);
                    break;
                case viewHistoryQuickInputButton:
                    quickPick.hide();
                    vscode.commands.executeCommand(Commands.viewHistory, viewItem);
                    break;
                case copyItemQuickInputButton:
                    const template = Config.get('worktreePick.copyTemplate', '$LABEL');
                    (/\$HASH|\$MESSAGE/.test(template)
                        ? getLashCommitDetail(viewItem.path, ['s', 'H'])
                        : Promise.resolve({} as Record<string, void>)
                    )
                        .then((commitDetail) => {
                            const text = template
                                .replace(/\$HASH/g, commitDetail.H || '')
                                .replace(/\$MESSAGE/g, commitDetail.s || '')
                                .replace(/\$FULL_PATH/g, viewItem.path)
                                .replace(/\$BASE_NAME/g, path.basename(viewItem.path))
                                .replace(/\$LABEL/g, viewItem.name);
                            vscode.env.clipboard.writeText(text).then(() => {
                                Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', text));
                            });
                        })
                        .catch((err) => {
                            Alert.showErrorMessage(err);
                        });
                    break;
                case checkoutBranchQuickInputButton:
                    canClose = false;
                    vscode.commands.executeCommand(Commands.checkoutBranch, viewItem).then((res) => {
                        canClose = true;
                        if (res === false) {
                            quickPick.hide();
                        } else {
                            // 需要重新渲染列表数据
                            updateList();
                            quickPick.show();
                        }
                    });
                    break;
                case moreQuickInputButton:
                    canClose = false;
                    // FIXME 改造quickPick
                    pickAction(viewItem)
                        .then(() => {
                            canClose = true;
                            updateList();
                            quickPick.show();
                        })
                        .catch(() => {
                            canClose = true;
                            quickPick.hide();
                        });
                    break;
            }
            resolve(selectedItem);
        });
        const onDidAccept = quickPick.onDidAccept(() => {
            let selectedItem = quickPick.selectedItems[0];
            if (selectedItem?.path) {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), {
                    forceNewWindow: true,
                });
            }
            resolve(selectedItem);
            quickPick.hide();
        });
        const onDidHide = quickPick.onDidHide(() => {
            if (!canClose) return;
            resolve();
            disposables.forEach((i) => i.dispose());
            disposables.length = 0;
            quickPick.dispose();
            changeUIVisibleEvent.fire({ type: QuickPickKind.pickWorktree, visible: false });
        });
        disposables.push(onDidAccept, onDidHide, onDidTriggerButton, onDidTriggerItemButton, initEvent);
        quickPick.busy = true;
        quickPick.show();
        changeUIVisibleEvent.fire({ type: QuickPickKind.pickWorktree, visible: true });
        list = GlobalState.get('workTreeCache', []);
        workspaceList = WorkspaceState.get('workTreeCache', []);
        updateList();
        // 先展示出缓存的数据
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        initList();
        return waiting;
    } catch {
        reject();
    }
};

interface QuickPickAction extends vscode.QuickPickItem {
    action:
        | 'copy'
        | Commands.openTerminal
        | Commands.openExternalTerminalContext
        | Commands.revealInSystemExplorerContext
        | Commands.addToWorkspace
        | Commands.removeFromWorkspace
        | Commands.viewHistory;
    hide?: boolean;
}

const getPickActionsByWorktree = async (viewItem: IWorktreeLess) => {
    const [commitDetail] = await Promise.all([getLashCommitDetail(viewItem.path, ['s', 'H'])]);
        const template = Config.get('worktreePick.copyTemplate', '$LABEL');
        const isCurrent = judgeIncludeFolder(viewItem.path);
        const items: QuickPickAction[] = [
            {
                iconPath: new vscode.ThemeIcon('copy'),
                label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('template content')),
                description: template
                    .replace(/\$HASH/g, commitDetail.H || '')
                    .replace(/\$MESSAGE/g, commitDetail.s || '')
                    .replace(/\$FULL_PATH/g, viewItem.path)
                    .replace(/\$BASE_NAME/g, path.basename(viewItem.path))
                    .replace(/\$LABEL/g, viewItem.name),
                action: 'copy',
            },
            {
                iconPath: new vscode.ThemeIcon('copy'),
                label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('ref name')),
                description: viewItem.name,
                action: 'copy',
            },
            {
                iconPath: new vscode.ThemeIcon('copy'),
                label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('commit hash')),
                description: commitDetail.H || '',
                action: 'copy',
            },
            {
                iconPath: new vscode.ThemeIcon('copy'),
                label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('commit message')),
                description: commitDetail.s || '',
                action: 'copy',
            },
            {
                iconPath: new vscode.ThemeIcon('copy'),
                label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('folder Path')),
                description: viewItem.path,
                action: 'copy',
            },
            {
                iconPath: new vscode.ThemeIcon('history'),
                label: vscode.l10n.t('View git history'),
                action: Commands.viewHistory,
            },
            {
                iconPath: new vscode.ThemeIcon('terminal-bash'),
                label: vscode.l10n.t('Open in External Terminal'),
                action: Commands.openExternalTerminalContext,
            },
            {
                iconPath: new vscode.ThemeIcon('terminal'),
                label: vscode.l10n.t('Open in VSCode built-in Terminal'),
                action: Commands.openTerminal,
            },
            {
                iconPath: new vscode.ThemeIcon('multiple-windows'),
                label: vscode.l10n.t('Add folder to workspace'),
                action: Commands.addToWorkspace,
                hide: isCurrent,
            },
            {
                iconPath: new vscode.ThemeIcon('close'),
                label: vscode.l10n.t('Remove folder from workspace'),
                action: Commands.removeFromWorkspace,
                hide: !isCurrent,
            },
            {
                iconPath: new vscode.ThemeIcon('folder-opened'),
                label: vscode.l10n.t('Reveal in the system explorer'),
                action: Commands.revealInSystemExplorerContext,
            },
        ];
        return items.filter(i => !i.hide);
};

export const pickAction = async (viewItem: IWorktreeLess) => {
    const disposables: vscode.Disposable[] = [];
    let resolve: (value: QuickPickAction | void | false) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<QuickPickAction | void | false>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const quickPick = vscode.window.createQuickPick<QuickPickAction>();
        quickPick.title = `${viewItem.name} ⇄ ${
            viewItem.path.length > 35 ? `...${viewItem.path.slice(-34)}` : viewItem.path
        }`;
        quickPick.placeholder = vscode.l10n.t('Please select an action');
        quickPick.buttons = [backButton];
        quickPick.busy = true;
        disposables.push(
            quickPick.onDidHide(() => {
                reject();
                disposables.forEach((i) => i.dispose());
                disposables.length = 0;
                quickPick.dispose();
            }),
            quickPick.onDidAccept(async () => {
                const item = quickPick.selectedItems[0];
                if (!item) {
                    resolve();
                    quickPick.hide();
                    return;
                }
                switch (item.action) {
                    case 'copy':
                        const detail = item.description || '';
                        await vscode.env.clipboard.writeText(detail).then(() => {
                            Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', detail));
                        });
                        break;
                    case Commands.openExternalTerminalContext:
                    case Commands.openTerminal:
                    case Commands.revealInSystemExplorerContext:
                    case Commands.viewHistory:
                        await vscode.commands.executeCommand(item.action, viewItem);
                        break;
                    case Commands.removeFromWorkspace:
                    case Commands.addToWorkspace:
                        reject();
                        quickPick.hide();
                        process.nextTick(() => {
                            vscode.commands.executeCommand(item.action, viewItem);
                        });
                        return;
                    default:
                        const value: never = item.action;
                        void value;
                        break;
                }
                resolve(item);
                quickPick.hide();
            }),
            quickPick.onDidTriggerButton((event) => {
                if (event === backButton) {
                    resolve();
                    quickPick.hide();
                    return;
                }
            }),
        );
        quickPick.show();
        await new Promise(r => process.nextTick(r));
        quickPick.items = await getPickActionsByWorktree(viewItem);
        quickPick.busy = false;
        return waiting;
    } catch {
        reject();
    }
};
