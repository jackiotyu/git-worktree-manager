import * as vscode from 'vscode';
import {
    formatTime,
    getWorkTreeList,
    checkGitValid,
    getAllRefList,
    judgeIncludeFolder,
    getLashCommitHash,
    getMainFolder,
} from '@/utils';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import { IWorkTreeCacheItem, IFolderItemConfig, DefaultDisplayList } from '@/types';
import { Commands, APP_NAME } from '@/constants';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/lib/adaptor/window';
import folderRoot from '@/lib/folderRoot';
import { updateTreeDataEvent } from '@/lib/events';
import path from 'path';
import {
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    revealInSystemExplorerQuickInputButton,
    copyItemQuickInputButton,
    addToWorkspaceQuickInputButton,
    openInNewWindowQuickInputButton,
    addWorktreeQuickInputButton,
    useWorkspaceWorktreeQuickInputButton,
    useAllWorktreeQuickInputButton,
    settingQuickInputButton,
    sortByBranchQuickInputButton,
    sortByRepoQuickInputButton,
    checkoutBranchQuickInputButton,
    backButton,
} from './quickPick.button';

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
        quickPick.buttons = [backButton];
        quickPick.onDidAccept(() => {
            resolve(quickPick.selectedItems[0]);
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            resolve();
            quickPick.dispose();
        });
        quickPick.onDidTriggerButton((event) => {
            if(event === backButton) {
                quickPick.hide();
            }
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
    const config = vscode.workspace.getConfiguration(APP_NAME);
    const pinCurRepo = config.get<boolean>('worktreePick.pinCurrentRepo', false);
    const copyTemplate = config.get<string>('worktreePick.copyTemplate', '$LABEL');
    const copyTooltip = vscode.l10n.t('Copy') + `: ${copyTemplate}`;

    const showExternalTerminal = config.get<boolean>('worktreePick.showExternalTerminal', false);
    const showTerminal = config.get<boolean>('worktreePick.showTerminal', false);
    const showRevealInSystemExplorer = config.get<boolean>('worktreePick.showRevealInSystemExplorer', false);
    const showCopy = config.get<boolean>('worktreePick.showCopy', false);
    const showAddToWorkspace = config.get<boolean>('worktreePick.showAddToWorkspace', false);
    const showCheckout = config.get<boolean>('worktreePick.showCheckout', true);

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
                button: openInNewWindowQuickInputButton,
                show: true,
            },
        ];

        const buttons: vscode.QuickInputButton[] = list.filter((i) => i.show).map((i) => i.button);
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

const updateWorkTreeCache = async () => {
    const gitFolders = GlobalState.get('gitFolders', []);
    let list: IWorkTreeCacheItem[] = await gitFolderToCaches(gitFolders);
    GlobalState.update('workTreeCache', list);
};

const gitFolderToCaches = async (gitFolders: IFolderItemConfig[]): Promise<IWorkTreeCacheItem[]> => {
    const worktreeList = await Promise.all(
        gitFolders.map(async (item) => {
            const list = await getWorkTreeList(item.path, true);
            return [list, item] as const;
        }),
    );
    return worktreeList
        .map(([list, config]) => {
            return list.map<IWorkTreeCacheItem>((row) => {
                return { ...row, label: config.name };
            });
        })
        .flat();
};

const updateWorkspaceListCache = async () => {
    const list = await Promise.all([...folderRoot.folderPathSet].map(async (folder) => await getMainFolder(folder)));
    const folders = [...new Set(list.filter((i) => i))].map((folder) => ({
        name: path.basename(folder),
        path: folder,
    }));
    const cache = await gitFolderToCaches(folders);
    WorkspaceState.update('workTreeCache', cache);
};

export const pickWorktree = async () => {
    const config = vscode.workspace.getConfiguration(APP_NAME);
    let checkList =
        config.get<DefaultDisplayList>('worktreePick.defaultDisplayList', DefaultDisplayList.all) ===
        DefaultDisplayList.all;

    const worktreeButtons = [
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
        quickPick.onDidTriggerButton((event) => {
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
            if (event === addWorktreeQuickInputButton) {
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
                    vscode.commands.executeCommand(Commands.openExternalTerminalContext, vieItem);
                    break;
                case openTerminalQuickInputButton:
                    vscode.commands.executeCommand(Commands.openTerminal, vieItem);
                    break;
                case revealInSystemExplorerQuickInputButton:
                    vscode.commands.executeCommand(Commands.revealInSystemExplorerContext, vieItem);
                    break;
                case addToWorkspaceQuickInputButton:
                    quickPick.hide();
                    vscode.commands.executeCommand(Commands.addToWorkspace, vieItem);
                    break;
                case copyItemQuickInputButton:
                    const template = vscode.workspace
                        .getConfiguration(APP_NAME)
                        .get<string>('worktreePick.copyTemplate', '$LABEL');
                    (/\$HASH/.test(template) ? getLashCommitHash(vieItem.path) : Promise.resolve(''))
                        .then((hash) => {
                            const text = template
                                .replace(/\$HASH/g, hash)
                                .replace(/\$FULL_PATH/g, vieItem.path)
                                .replace(/\$BASE_NAME/g, path.basename(vieItem.path))
                                .replace(/\$LABEL/g, vieItem.name);
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
                    vscode.commands.executeCommand(Commands.checkoutBranch, vieItem).then(() => {
                        canClose = true;
                        // 需要重新渲染列表数据
                        updateList();
                        quickPick.show();
                    });
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
            if (!canClose) return;
            resolve();
            quickPick.dispose();
            initEvent?.dispose();
        });
        quickPick.busy = true;
        quickPick.show();
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
