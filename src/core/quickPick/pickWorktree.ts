import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder } from '@/core/util/folder';
import { getRecentFolderCache } from '@/core/util/cache';
import { GlobalState, WorkspaceState } from '@/core/state';
import { IWorktreeCacheItem, DefaultDisplayList, IWorktreeLess, IRecentUriCache } from '@/types';
import { Commands, RefreshCacheType } from '@/constants';
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
    refreshRecentlyQuickInputButton,
    refreshAllWorktreeQuickInputButton,
    refreshWorkspaceWorktreeQuickInputButton,
    saveRepoQuickInputButton,
} from './quickPick.button';
import { pickAction } from '@/core/quickPick/pickAction';
import { withResolvers } from '@/core/util/promise';

interface WorktreePick extends vscode.QuickPickItem {
    path?: string;
}

interface IActionService extends vscode.Disposable {
    canClose: boolean;
    sortByBranch: boolean;
    recentUriCache: IRecentUriCache;
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

    let items = list.map((row) => {
        const isCurrent = judgeIncludeFolder(row.path);
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
                show: copyItemQuickInputButton.enabled,
            },
            {
                button: checkoutBranchQuickInputButton,
                show: checkoutBranchQuickInputButton.enabled,
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
                show: openRepositoryQuickInputButton.enabled,
            },
            {
                button: moreQuickInputButton,
                show: moreQuickInputButton.enabled,
            },
            {
                button: openInNewWindowQuickInputButton,
                show: openInNewWindowQuickInputButton.enabled,
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

const mapRecentWorktreePickItems = (list: vscode.Uri[]): WorktreePick[] => {
    return list.map((uri) => {
        const baseName = path.basename(uri.fsPath);
        return {
            label: baseName || uri.fsPath,
            description: baseName ? uri.fsPath : '',
            iconPath: vscode.ThemeIcon.Folder,
            path: uri.fsPath,
            buttons: [
                saveRepoQuickInputButton,
                openExternalTerminalQuickInputButton,
                openTerminalQuickInputButton,
                revealInSystemExplorerQuickInputButton,
                openRepositoryQuickInputButton,
                addToWorkspaceQuickInputButton,
                openInNewWindowQuickInputButton,
            ].filter((i) => i.enabled),
        };
    });
};

const handleAccept = ({ resolve, reject, quickPick }: HandlerArgs) => {
    let selectedItem = quickPick.selectedItems[0];
    if (selectedItem?.path) {
        vscode.commands
            .executeCommand('vscode.openFolder', vscode.Uri.file(selectedItem.path), { forceNewWindow: true })
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
    if (event === refreshAllWorktreeQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.all);
        return;
    }
    if(event === refreshWorkspaceWorktreeQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.workspace);
        return;
    }
    if (event === refreshRecentlyQuickInputButton) {
        vscode.commands.executeCommand(Commands.refreshRecentFolder);
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
        case saveRepoQuickInputButton:
            vscode.commands.executeCommand(Commands.addToGitFolder, viewItem);
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
    displayType: DefaultDisplayList = Config.get('worktreePick.defaultDisplayList', DefaultDisplayList.all);
    worktreeButtons: vscode.QuickInputButton[] = [];
    recentUriCache: IRecentUriCache = getRecentFolderCache();
    recentPickCache: WorktreePick[] = [];
    disposables: vscode.Disposable[] = [];
    constructor(private quickPick: vscode.QuickPick<WorktreePick>, displayType?: DefaultDisplayList) {
        this.updateButtons(displayType);
        this.disposables.push(
            globalStateEvent.event((e) => {
                e === 'global.recentFolderCache' && this.updateList();
            }),
            globalStateEvent.event((e) => {
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
        switch (displayList) {
            case DefaultDisplayList.all:
            case DefaultDisplayList.workspace:
                this.worktreeButtons = [
                    refreshWorktreeButton,
                    sortButton,
                    addGitRepoQuickInputButton,
                    addWorktreeQuickInputButton,
                    showWorktreeButton,
                    settingQuickInputButton,
                    openRecentlyQuickInputButton,
                ];
                break;
            case DefaultDisplayList.recentlyOpened:
                this.worktreeButtons = [
                    refreshRecentlyQuickInputButton,
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
                this.recentUriCache = getRecentFolderCache();
                this.recentPickCache.length = 0;
            }
            if (this.recentPickCache.length) {
                this.quickPick.items = this.recentPickCache;
            } else {
                this.quickPick.items = [];
                const list = mapRecentWorktreePickItems(this.recentUriCache.list);
                this.recentPickCache = list;
                this.quickPick.items = list;
            }
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
    if(firstOpen) vscode.commands.executeCommand(Commands.refreshWorktreeCache, RefreshCacheType.workspace);
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
