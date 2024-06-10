import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder } from '@/core/util/folder';
import { updateWorktreeCache, updateWorkspaceListCache } from '@/core/util/cache';
import { GlobalState, WorkspaceState } from '@/core/state';
import { IWorktreeCacheItem, DefaultDisplayList, IWorktreeLess } from '@/types';
import { Commands, QuickPickKind } from '@/constants';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/core/ui/message';
import { Config } from '@/core/config/setting';
import folderRoot from '@/core/folderRoot';
import { updateTreeDataEvent, changeUIVisibleEvent } from '@/core/event/events';
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
    addWorktreeQuickInputButton,
    moreQuickInputButton,
    viewHistoryQuickInputButton,
    openRepositoryQuickInputButton,
} from './quickPick.button';
import { pickAction } from '@/core/quickPick/pickAction';

interface WorktreePick extends vscode.QuickPickItem {
    path?: string;
}

const mapWorktreePickItems = (list: IWorktreeCacheItem[]): WorktreePick[] => {
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
    const showOpenRepository = Config.get('worktreePick.showOpenRepository', true);

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
                button: openRepositoryQuickInputButton,
                show: showOpenRepository,
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
    return Object.keys(groupMap).reduce<WorktreePick[]>((list, key) => {
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
    let displayAll = Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.all) === DefaultDisplayList.all;

    const worktreeButtons = [
        addGitRepoQuickInputButton,
        addWorktreeQuickInputButton,
        displayAll ? useWorkspaceWorktreeQuickInputButton : useAllWorktreeQuickInputButton,
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
    let waiting = new Promise<WorktreePick | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        let list: IWorktreeCacheItem[] = [];
        let workspaceList: IWorktreeCacheItem[] = [];
        let listLoading: boolean = true;
        let workspaceListLoading: boolean = true;
        let checkSortByBranch = false;
        let canClose = true;

        const updateList = () => {
            let items = displayAll ? mapWorktreePickItems(list) : mapWorktreePickItems(workspaceList);
            const busy = displayAll ? listLoading : workspaceListLoading;
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
            updateWorktreeCache().then(() => {
                list = GlobalState.get('workTreeCache', []);
                listLoading = false;
                updateList();
            });
        };

        const initEvent: vscode.Disposable = updateTreeDataEvent.event(initList);

        const quickPick = vscode.window.createQuickPick<WorktreePick>();
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
                displayAll = true;
                updateList();
                quickPick.buttons = exchangeButton(
                    useAllWorktreeQuickInputButton,
                    useWorkspaceWorktreeQuickInputButton,
                );
                return;
            }
            if (event === useWorkspaceWorktreeQuickInputButton) {
                displayAll = false;
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
                vscode.commands.executeCommand(Commands.addWorktree).then((res) => {
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
                case openRepositoryQuickInputButton:
                    vscode.commands.executeCommand(Commands.openRepository, viewItem);
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
