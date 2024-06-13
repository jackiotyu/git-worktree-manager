import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder } from '@/core/util/folder';
import { updateWorktreeCache, updateWorkspaceListCache, getRecentFolderCache } from '@/core/util/cache';
import { GlobalState, WorkspaceState } from '@/core/state';
import { IWorktreeCacheItem, DefaultDisplayList, IWorktreeLess, IRecentUriCache } from '@/types';
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
    openRecentlyQuickInputButton,
    backWorkspaceQuickInputButton,
} from './quickPick.button';
import { pickAction } from '@/core/quickPick/pickAction';
import { getNameRev } from '../git/getNameRev';

interface WorktreePick extends vscode.QuickPickItem {
    path?: string;
}

interface IActionService {
    canClose: boolean;
    sortByBranch: boolean;
    listLoading: boolean;
    workspaceListLoading: boolean;
    workspaceList: IWorktreeCacheItem[];
    list: IWorktreeCacheItem[];
    recentUriCache: IRecentUriCache;
    recentPickCache: WorktreePick[];
    displayType: DefaultDisplayList;
    updateList: () => void;
    initList: () => void;
    updateButtons: (displayType?: DefaultDisplayList) => vscode.QuickInputButton[];
    worktreeButtons: vscode.QuickInputButton[];
}

type ResolveValue = WorktreePick | void;
type ResolveType = (value: ResolveValue) => void;
type RejectType = (value?: any) => void;

interface HandlerArgs {
    resolve: ResolveType;
    reject: RejectType;
    quickPick: vscode.QuickPick<WorktreePick>;
}

interface HideHanderArgs extends HandlerArgs {
    actionService: IActionService;
    disposables: vscode.Disposable[];
}

interface TriggerButtonHandlerArgs extends HandlerArgs {
    event: vscode.QuickInputButton;
    actionService: IActionService;
}
interface TriggerItemButtonHandlerArgs extends HandlerArgs {
    event: vscode.QuickPickItemButtonEvent<WorktreePick>;
    actionService: IActionService;
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

const mapRecentWorktreePickItems = async (list: vscode.Uri[]): Promise<WorktreePick[]> => {
    return Promise.all(
        list.map(async (uri) => {
            let name = '';
            try {
                name = await getNameRev(uri.fsPath);
            } catch {}
            return {
                label: name ? path.basename(name).trim() : path.basename(uri.path),
                detail: uri.path,
                iconPath: name ? new vscode.ThemeIcon('source-control') : undefined,
                description: name ? `⇄ ${path.basename(uri.path)}` : '',
                path: uri.fsPath,
                uri: uri,
                buttons: name ? [
                    openExternalTerminalQuickInputButton,
                    openTerminalQuickInputButton,
                    revealInSystemExplorerQuickInputButton,
                    checkoutBranchQuickInputButton,
                    addToWorkspaceQuickInputButton,
                    viewHistoryQuickInputButton,
                    openRepositoryQuickInputButton,
                    moreQuickInputButton,
                    openInNewWindowQuickInputButton,
                ] : [],
            };
        }),
    );
};

const handleAccept = ({ resolve, reject, quickPick }: HandlerArgs) => {
    let selectedItem = quickPick.selectedItems[0];
    if (selectedItem?.path) {
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), {
            forceNewWindow: true,
        });
    }
    resolve(selectedItem);
    quickPick.hide();
};

const handleHide = ({ resolve, reject, quickPick, actionService, disposables }: HideHanderArgs) => {
    if (!actionService.canClose) return;
    resolve();
    disposables.forEach((i) => i.dispose());
    disposables.length = 0;
    quickPick.dispose();
    changeUIVisibleEvent.fire({ type: QuickPickKind.pickWorktree, visible: false });
};

const handleTriggerButton = ({ resolve, reject, quickPick, event, actionService }: TriggerButtonHandlerArgs) => {
    if (event === sortByBranchQuickInputButton) {
        actionService.sortByBranch = true;
        actionService.updateList();
        quickPick.buttons = actionService.updateButtons();
        return;
    }
    if (event === sortByRepoQuickInputButton) {
        actionService.sortByBranch = false;
        quickPick.buttons = actionService.updateButtons();
        actionService.updateList();
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
        quickPick.buttons = actionService.updateButtons(DefaultDisplayList.all);
        actionService.updateList();
        return;
    }
    if (event === useWorkspaceWorktreeQuickInputButton) {
        quickPick.buttons = actionService.updateButtons(DefaultDisplayList.workspace);
        actionService.updateList();
        return;
    }
    if (event === addWorktreeQuickInputButton) {
        // FIXME 改造quickPick
        actionService.canClose = false;
        vscode.commands.executeCommand(Commands.addWorktree).then((res) => {
            actionService.canClose = true;
            if (res === false) {
                quickPick.hide();
            } else {
                // 需要重新渲染列表数据
                actionService.updateList();
                quickPick.show();
            }
        });
        quickPick.hide();
        return;
    }
    if (event === openRecentlyQuickInputButton) {
        actionService.displayType = DefaultDisplayList.recentlyOpened;
        actionService.updateList();
        quickPick.buttons = actionService.updateButtons();
        return;
    }
    if (event === backWorkspaceQuickInputButton) {
        actionService.displayType = DefaultDisplayList.all;
        actionService.updateList();
        quickPick.buttons = actionService.updateButtons();
        return;
    }
};

const handleTriggerItemButton = ({
    resolve,
    reject,
    quickPick,
    event,
    actionService,
}: TriggerItemButtonHandlerArgs) => {
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
            actionService.canClose = false;
            vscode.commands.executeCommand(Commands.checkoutBranch, viewItem).then((res) => {
                actionService.canClose = true;
                if (res === false) {
                    quickPick.hide();
                } else {
                    // 需要重新渲染列表数据
                    actionService.updateList();
                    quickPick.show();
                }
            });
            break;
        case moreQuickInputButton:
            actionService.canClose = false;
            // FIXME 改造quickPick
            pickAction(viewItem)
                .then(() => {
                    actionService.canClose = true;
                    actionService.updateList();
                    quickPick.show();
                })
                .catch(() => {
                    actionService.canClose = true;
                    quickPick.hide();
                });
            break;
    }
    resolve(selectedItem);
};

class ActionService implements IActionService {
    canClose: boolean = true;
    sortByBranch: boolean = false;
    listLoading: boolean = true;
    displayType: DefaultDisplayList = Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.all);
    workspaceListLoading: boolean = true;
    worktreeButtons: vscode.QuickInputButton[] = [];
    workspaceList: IWorktreeCacheItem[] = WorkspaceState.get('workTreeCache', []);
    list: IWorktreeCacheItem[] = GlobalState.get('workTreeCache', []);
    recentUriCache: IRecentUriCache = getRecentFolderCache();
    recentPickCache: WorktreePick[] = [];
    constructor(private quickPick: vscode.QuickPick<WorktreePick>) {
        this.updateButtons();
    }
    get displayAll() {
        return this.displayType === DefaultDisplayList.all;
    }
    updateButtons = (displayType: DefaultDisplayList = this.displayType) => {
        this.displayType = displayType;
        const displayList = this.displayType;
        const sortButton = this.sortByBranch ? sortByBranchQuickInputButton : sortByRepoQuickInputButton;
        const showWorktreeButton = this.displayAll
            ? useWorkspaceWorktreeQuickInputButton
            : useAllWorktreeQuickInputButton;
        switch (displayList) {
            case DefaultDisplayList.all:
            case DefaultDisplayList.workspace:
                this.worktreeButtons = [
                    openRecentlyQuickInputButton,
                    addGitRepoQuickInputButton,
                    addWorktreeQuickInputButton,
                    showWorktreeButton,
                    settingQuickInputButton,
                    sortButton,
                ];
                break;
            case DefaultDisplayList.recentlyOpened:
                this.worktreeButtons = [
                    backWorkspaceQuickInputButton,
                    addGitRepoQuickInputButton,
                    addWorktreeQuickInputButton,
                    settingQuickInputButton,
                ];
                break;
            default:
                let e: never = displayList;
                void e;
                break;
        }
        return this.worktreeButtons;
    };
    updateList = () => {
        let items: WorktreePick[] = [];
        let busy: boolean = false;
        if (this.displayType === DefaultDisplayList.recentlyOpened) {
            if (this.recentPickCache.length) {
                this.quickPick.items = this.recentPickCache;
                this.quickPick.busy = false;
            } else {
                this.quickPick.busy = true;
                this.quickPick.items = [];
                mapRecentWorktreePickItems(this.recentUriCache.list).then((list) => {
                    this.recentPickCache = list;
                    this.quickPick.items = list;
                    this.quickPick.busy = false;
                });
            }
        } else {
            items = this.displayAll ? mapWorktreePickItems(this.list) : mapWorktreePickItems(this.workspaceList);
            busy = this.displayAll ? this.listLoading : this.workspaceListLoading;
            if (this.sortByBranch) {
                items = items
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
            }
            this.quickPick.busy = busy;
            this.quickPick.items = items;
        }
    };
    initList = () => {
        updateWorkspaceListCache().then(() => {
            this.workspaceList = WorkspaceState.get('workTreeCache', []);
            this.workspaceListLoading = false;
            this.updateList();
        });
        updateWorktreeCache().then(() => {
            this.list = GlobalState.get('workTreeCache', []);
            this.listLoading = false;
            this.updateList();
        });
    };
}

export const pickWorktree = async () => {
    const disposables: vscode.Disposable[] = [];
    const quickPick = vscode.window.createQuickPick<WorktreePick>();
    const actionService: IActionService = new ActionService(quickPick);
    let resolve: ResolveType = () => {};
    let reject: RejectType = () => {};
    let waiting = new Promise<ResolveValue>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const initEvent: vscode.Disposable = updateTreeDataEvent.event(actionService.initList);
        quickPick.placeholder = vscode.l10n.t('Select to open in new window');
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.keepScrollPosition = true;
        quickPick.buttons = actionService.worktreeButtons;
        const onDidTriggerButton = quickPick.onDidTriggerButton((event) =>
            handleTriggerButton({ resolve, reject, quickPick, event, actionService }),
        );
        const onDidTriggerItemButton = quickPick.onDidTriggerItemButton((event) =>
            handleTriggerItemButton({ resolve, reject, quickPick, event, actionService }),
        );
        const onDidAccept = quickPick.onDidAccept(() => handleAccept({ resolve, reject, quickPick }));
        const onDidHide = quickPick.onDidHide(() =>
            handleHide({ resolve, reject, quickPick, actionService, disposables }),
        );
        disposables.push(onDidAccept, onDidHide, onDidTriggerButton, onDidTriggerItemButton, initEvent);
        quickPick.busy = true;
        quickPick.show();
        changeUIVisibleEvent.fire({ type: QuickPickKind.pickWorktree, visible: true });
        actionService.updateList();
        // 先展示出缓存的数据
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        actionService.initList();
        return waiting;
    } catch {
        reject();
    }
};
