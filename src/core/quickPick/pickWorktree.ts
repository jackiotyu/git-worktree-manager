import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder, getRecentItemIcon } from '@/core/util/folder';
import { getRecentItemCache, getFavoriteCache } from '@/core/util/cache';
import { GlobalState, WorkspaceState } from '@/core/state';
import { IWorktreeCacheItem, DefaultDisplayList, IWorktreeLess, IRecentItemCache, IRecentItem } from '@/types';
import { Commands, RefreshCacheType, RecentItemType } from '@/constants';
import groupBy from 'lodash-es/groupBy';
import { Alert } from '@/core/ui/message';
import { Config } from '@/core/config/setting';
import folderRoot from '@/core/folderRoot';
import { globalStateEvent, workspaceStateEvent } from '@/core/event/events';
import path from 'path';
import {
    openExternalTerminalQuickInputButton,
    openTerminalQuickInputButton,
    revealInSystemExplorerQuickInputButton,
    copyItemQuickInputButton,
    addToWorkspaceQuickInputButton,
    removeFromWorkspaceQuickInputButton,
    openInCurrentWindowQuickInputButton,
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
    refreshRecentlyQuickInputButton,
    refreshAllWorktreeQuickInputButton,
    refreshWorkspaceWorktreeQuickInputButton,
    removeWorktreeQuickInputButton,
    saveRepoQuickInputButton,
    saveFavoriteQuickInputButton,
    useFavoriteQuickInputButton,
    useRecentlyQuickInputButton,
    refreshFavoriteQuickInputButton,
} from './quickPick.button';
import { pickAction } from '@/core/quickPick/pickAction';
import { withResolvers } from '@/core/util/promise';

interface IWorktreePick extends vscode.QuickPickItem {
    kind: vscode.QuickPickItemKind.Default;
    fsPath: string;
    uriPath: string;
    item?: IRecentItem;
}

interface IWorktreeSeparator extends vscode.QuickPickItem {
    kind: vscode.QuickPickItemKind.Separator;
    uriPath: '';
    fsPath: '';
    item?: IRecentItem;
}

type WorktreePick = IWorktreePick | IWorktreeSeparator;

interface IActionService extends vscode.Disposable {
    canClose: boolean;
    sortByBranch: boolean;
    recentUriCache: IRecentItemCache;
    recentPickCache: WorktreePick[];
    displayType: DefaultDisplayList;
    updateList: (forceUpdate?: boolean) => void;
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

    let items: WorktreePick[] = list.map((row) => {
        const isCurrent = judgeIncludeFolder(row.path);
        const notBare = !row.isBare;
        const list: { button: vscode.QuickInputButton; show: boolean }[] = [
            {
                button: openExternalTerminalQuickInputButton,
                show: openExternalTerminalQuickInputButton.enabled,
            },
            {
                button: openTerminalQuickInputButton,
                show: openTerminalQuickInputButton.enabled,
            },
            {
                button: revealInSystemExplorerQuickInputButton,
                show: revealInSystemExplorerQuickInputButton.enabled,
            },
            {
                button: Object.assign(copyItemQuickInputButton, { tooltip: copyTooltip }),
                show: notBare && copyItemQuickInputButton.enabled,
            },
            {
                button: checkoutBranchQuickInputButton,
                show: notBare && checkoutBranchQuickInputButton.enabled,
            },
            {
                button: addToWorkspaceQuickInputButton,
                show: !isCurrent && addToWorkspaceQuickInputButton.enabled,
            },
            {
                button: removeFromWorkspaceQuickInputButton,
                show: isCurrent && removeFromWorkspaceQuickInputButton.enabled,
            },
            {
                button: viewHistoryQuickInputButton,
                show: viewHistoryQuickInputButton.enabled,
            },
            {
                button: openRepositoryQuickInputButton,
                show: notBare && openRepositoryQuickInputButton.enabled,
            },
            {
                button: removeWorktreeQuickInputButton,
                show: notBare && removeWorktreeQuickInputButton.enabled,
            },
            {
                button: moreQuickInputButton,
                show: moreQuickInputButton.enabled,
            },
            {
                button: openInCurrentWindowQuickInputButton,
                show: openInCurrentWindowQuickInputButton.enabled,
            },
        ];

        const buttons: vscode.QuickInputButton[] = list.filter((i) => i.show).map((i) => i.button);
        const uri = vscode.Uri.file(row.path);
        return {
            kind: vscode.QuickPickItemKind.Default,
            label: row.name,
            detail: `$(blank)  ${row.path}`,
            description: `⇄ ${row.label}${row.isMain ? ' ✨' : ''}`,
            fsPath: uri.fsPath,
            uriPath: uri.toString(),
            key: row.label,
            iconPath: isCurrent ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('window'),
            buttons: buttons,
        };
    });
    let groupMap = groupBy(items, 'key');
    let pathSize = folderRoot.folderPathSet.size;
    return Object.keys(groupMap).reduce<WorktreePick[]>((list, key) => {
        if (pinCurRepo && pathSize && groupMap[key].some((item) => judgeIncludeFolder(item.fsPath))) {
            list.unshift({ kind: vscode.QuickPickItemKind.Separator, label: '', fsPath: '', uriPath: '' });
            list.unshift(...groupMap[key]);
            pathSize--;
        } else {
            list.push(...groupMap[key]);
            list.push({ kind: vscode.QuickPickItemKind.Separator, label: '', fsPath: '', uriPath: '' });
        }
        return list;
    }, []);
};

interface IWorkspaceButtonMap {
    folderButtons: vscode.QuickInputButton[];
    fileButtons: vscode.QuickInputButton[];
    workspaceButtons: vscode.QuickInputButton[];
}
const getWorkspacePickButtonMap = (displayType: DefaultDisplayList): IWorkspaceButtonMap => {
    let folderButtons: vscode.QuickInputButton[] = [
        saveRepoQuickInputButton,
        saveFavoriteQuickInputButton,
        openExternalTerminalQuickInputButton,
        openTerminalQuickInputButton,
        revealInSystemExplorerQuickInputButton,
        openRepositoryQuickInputButton,
        addToWorkspaceQuickInputButton,
        openInCurrentWindowQuickInputButton,
    ].filter((i) => i.enabled);

    let fileButtons: vscode.QuickInputButton[] = [
        saveFavoriteQuickInputButton,
        revealInSystemExplorerQuickInputButton,
        openInCurrentWindowQuickInputButton,
    ].filter((i) => i.enabled);

    let workspaceButtons: vscode.QuickInputButton[] = [
        saveFavoriteQuickInputButton,
        revealInSystemExplorerQuickInputButton,
        openInCurrentWindowQuickInputButton,
    ].filter((i) => i.enabled);

    if (displayType === DefaultDisplayList.favorites) {
        folderButtons = folderButtons.filter((button) => button !== saveFavoriteQuickInputButton);
        fileButtons = fileButtons.filter((button) => button !== saveFavoriteQuickInputButton);
        workspaceButtons = workspaceButtons.filter((button) => button !== saveFavoriteQuickInputButton);
    }
    return {
        folderButtons,
        fileButtons,
        workspaceButtons,
    };
};

const getWorkspacePickButtons = (type: RecentItemType, buttonMap: IWorkspaceButtonMap): vscode.QuickInputButton[] => {
    if (type === RecentItemType.folder) return buttonMap.folderButtons;
    else if (type === RecentItemType.file) return buttonMap.fileButtons;
    else if (type === RecentItemType.workspace) return buttonMap.workspaceButtons;
    return [];
};

const mapWorkspacePickItems = (list: IRecentItem[], disPlayType: DefaultDisplayList): WorktreePick[] => {
    const buttonMap = getWorkspacePickButtonMap(disPlayType);
    return list.map((item) => {
        const uri = vscode.Uri.parse(item.path);
        return {
            kind: vscode.QuickPickItemKind.Default,
            label: item.label,
            description: uri.fsPath,
            iconPath: getRecentItemIcon(item.type),
            uriPath: uri.toString(),
            fsPath: uri.fsPath,
            buttons: getWorkspacePickButtons(item.type, buttonMap),
            item: item,
        };
    });
};

const handleAccept = ({ resolve, reject, quickPick }: HandlerArgs) => {
    let selectedItem = quickPick.selectedItems[0];
    if (selectedItem.uriPath) {
        vscode.commands
            .executeCommand('vscode.openFolder', vscode.Uri.parse(selectedItem.uriPath), { forceNewWindow: true })
            .then(() => {
                vscode.commands.executeCommand(Commands.refreshRecentFolder);
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
};

const handleTriggerButton = ({ resolve, reject, quickPick, event, actionService }: TriggerButtonHandlerArgs) => {
    if (event === sortByBranchQuickInputButton) {
        actionService.sortByBranch = true;
        quickPick.buttons = actionService.updateButtons();
        actionService.updateList();
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
    if (event === useRecentlyQuickInputButton) {
        quickPick.buttons = actionService.updateButtons(DefaultDisplayList.recentlyOpened);
        actionService.updateList();
        return;
    }
    if (event === useFavoriteQuickInputButton) {
        quickPick.buttons = actionService.updateButtons(DefaultDisplayList.favorites);
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
        const defaultType = Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.workspace);
        actionService.displayType = [DefaultDisplayList.workspace, DefaultDisplayList.all].includes(defaultType)
            ? defaultType
            : DefaultDisplayList.workspace;
        actionService.updateList();
        quickPick.buttons = actionService.updateButtons();
        return;
    }
    if (event === refreshAllWorktreeQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.all);
        return;
    }
    if (event === refreshWorkspaceWorktreeQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.workspace);
        return;
    }
    if (event === refreshRecentlyQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshRecentFolder);
        return;
    }
    if (event === refreshFavoriteQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshFavorite);
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
    if (!selectedItem.fsPath || !selectedItem.uriPath) {
        return;
    }
    const viewItem: IWorktreeLess = {
        name: selectedItem.label,
        fsPath: selectedItem.fsPath,
        uriPath: selectedItem.uriPath,
        item: selectedItem.item,
    };
    switch (button) {
        case openInCurrentWindowQuickInputButton:
            vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(selectedItem.uriPath), {
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
        case saveRepoQuickInputButton:
            vscode.commands.executeCommand(Commands.addToGitFolder, viewItem);
            break;
        case saveFavoriteQuickInputButton:
            vscode.commands.executeCommand(Commands.addToFavorite, viewItem);
            break;
        case removeWorktreeQuickInputButton:
            vscode.commands.executeCommand(Commands.removeWorktree, viewItem);
            break;
        case copyItemQuickInputButton:
            const template = Config.get('worktreePick.copyTemplate', '$LABEL');
            (/\$HASH|\$MESSAGE/.test(template)
                ? getLashCommitDetail(viewItem.fsPath, ['s', 'H'])
                : Promise.resolve({} as Record<string, void>)
            )
                .then((commitDetail) => {
                    const text = template
                        .replace(/\$HASH/g, commitDetail.H || '')
                        .replace(/\$MESSAGE/g, commitDetail.s || '')
                        .replace(/\$FULL_PATH/g, viewItem.fsPath)
                        .replace(/\$BASE_NAME/g, path.basename(viewItem.fsPath))
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
    displayType: DefaultDisplayList = Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.workspace);
    worktreeButtons: vscode.QuickInputButton[] = [];
    recentUriCache: IRecentItemCache = getRecentItemCache();
    recentPickCache: WorktreePick[] = [];

    disposables: vscode.Disposable[] = [];
    constructor(private quickPick: vscode.QuickPick<WorktreePick>, displayType?: DefaultDisplayList) {
        this.updateButtons(displayType);
        this.disposables.push(
            globalStateEvent.event((e) => {
                e === 'global.recentItemCache' && this.updateList(true);
                e === 'global.favorite' && this.updateList();
                e === 'workTreeCache' && this.updateList();
            }),
            workspaceStateEvent.event((e) => {
                e === 'workTreeCache' && this.updateList();
            }),
        );
    }
    get displayAll() {
        return this.displayType === DefaultDisplayList.all;
    }
    get displayFavorites() {
        return this.displayType === DefaultDisplayList.favorites;
    }
    updateButtons = (displayType: DefaultDisplayList = this.displayType) => {
        this.displayType = displayType;
        const displayList = this.displayType;
        const sortButton = this.sortByBranch ? sortByRepoQuickInputButton : sortByBranchQuickInputButton;
        const showWorktreeButton = this.displayAll
            ? useWorkspaceWorktreeQuickInputButton
            : useAllWorktreeQuickInputButton;
        const refreshWorktreeButton = this.displayAll
            ? refreshAllWorktreeQuickInputButton
            : refreshWorkspaceWorktreeQuickInputButton;
        const showFolderButton = this.displayFavorites ? useRecentlyQuickInputButton : useFavoriteQuickInputButton;
        const refreshFolderButton = this.displayFavorites
            ? refreshRecentlyQuickInputButton
            : refreshFavoriteQuickInputButton;

        switch (displayList) {
            case DefaultDisplayList.all:
            case DefaultDisplayList.workspace:
                this.worktreeButtons = [
                    refreshWorktreeButton,
                    showWorktreeButton,
                    sortButton,
                    addGitRepoQuickInputButton,
                    addWorktreeQuickInputButton,
                    settingQuickInputButton,
                    openRecentlyQuickInputButton,
                ];
                break;
            case DefaultDisplayList.recentlyOpened:
                this.worktreeButtons = [
                    refreshRecentlyQuickInputButton,
                    showFolderButton,
                    settingQuickInputButton,
                    backWorkspaceQuickInputButton,
                ];
                break;
            case DefaultDisplayList.favorites:
                this.worktreeButtons = [
                    refreshFolderButton,
                    showFolderButton,
                    settingQuickInputButton,
                    backWorkspaceQuickInputButton,
                ];
                break;
            default:
                let e: never = displayList;
                void e;
                break;
        }
        return this.worktreeButtons;
    };
    updateList = (forceUpdate?: boolean) => {
        let items: WorktreePick[] = [];
        if (this.displayType === DefaultDisplayList.recentlyOpened) {
            if (forceUpdate) {
                this.recentUriCache = getRecentItemCache();
                this.recentPickCache.length = 0;
            }
            if (this.recentPickCache.length) {
                this.quickPick.items = this.recentPickCache;
            } else {
                this.quickPick.items = [];
                const list = mapWorkspacePickItems(this.recentUriCache.list, DefaultDisplayList.recentlyOpened);
                this.recentPickCache = list;
                this.quickPick.items = list;
            }
        } else if (this.displayType === DefaultDisplayList.favorites) {
            this.quickPick.items = mapWorkspacePickItems(getFavoriteCache(), DefaultDisplayList.favorites);
        } else {
            items = this.displayAll
                ? mapWorktreePickItems(GlobalState.get('workTreeCache', []))
                : mapWorktreePickItems(WorkspaceState.get('workTreeCache', []));
            if (this.sortByBranch) {
                items = items
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .filter((i) => i.kind !== vscode.QuickPickItemKind.Separator);
            }
            this.quickPick.items = items;
        }
    };
    dispose = () => {
        this.disposables.forEach((i) => i.dispose());
        this.disposables.length = 0;
    };
}

let firstOpen = true;
export const pickWorktree = async (type?: DefaultDisplayList) => {
    if (firstOpen) vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.workspace);
    firstOpen = false;
    const disposables: vscode.Disposable[] = [];
    const quickPick = vscode.window.createQuickPick<WorktreePick>();
    const actionService = new ActionService(quickPick, type);
    const { resolve, reject, promise } = withResolvers<ResolveValue>();
    try {
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
        disposables.push(onDidAccept, onDidHide, onDidTriggerButton, onDidTriggerItemButton, actionService);
        quickPick.show();
        actionService.updateList();
        // 先展示出缓存的数据
        await new Promise<void>((resolve) => setTimeout(resolve, 30));
        return promise;
    } catch {
        reject();
    }
};
