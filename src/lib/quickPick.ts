import * as vscode from 'vscode';
import { getBranchList, getRemoteBranchList, getTagList, formatTime, getWorkTreeList, checkGitValid } from '@/utils';
import { GlobalState } from '@/lib/globalState';
import { WorkTreeCacheItem } from '@/types';
import localize from '@/localize';
import groupBy from 'lodash/groupBy';
import { Alert } from '@/lib/adaptor/window';

interface BranchForWorkTree extends vscode.QuickPickItem {
    branch?: string;
    hash?: string;
}

export const pickBranch = async (
    title: string = localize('msg.info.createWorkTree'),
    placeholder: string = localize('msg.placeholder.createWorkTree'),
    cwd?: string,
): Promise<BranchForWorkTree | void> => {
    let resolve: (value?: BranchForWorkTree | void) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<BranchForWorkTree | void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        let isValidGit = await checkGitValid();
        if (!isValidGit) {
            Alert.showErrorMessage(localize('msg.error.invalidGitFolder'));
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
        quickPick.show();
        quickPick.busy = true;
        const [branchList, remoteBranchList, tagList] = await Promise.all([
            getBranchList(['refname:short', 'objectname:short', 'worktreepath', 'authordate', 'HEAD'], cwd),
            getRemoteBranchList(['refname:short', 'objectname:short'], cwd),
            getTagList(['refname:short', 'objectname:short'], cwd),
        ]);

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

interface WorkTreePick extends vscode.QuickPickItem {
    path?: string;
}

const mapWorkTreePickItems = (list: WorkTreeCacheItem[]): WorkTreePick[] => {
    let items = list.map((row) => {
        return {
            label: row.name,
            detail: `${row.path}`,
            description: `⇄ ${row.label}`,
            path: row.path,
            key: row.label,
            iconPath: new vscode.ThemeIcon('repo'),
            buttons: [
                {
                    iconPath: new vscode.ThemeIcon('arrow-right'),
                    tooltip: localize('cmd.switchToSelectFolder'),
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
        let list: WorkTreeCacheItem[] = [];
        const quickPick = vscode.window.createQuickPick<WorkTreePick>();
        quickPick.placeholder = localize('msg.placeholder.pickWorktree');
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.keepScrollPosition = true;
        const sortByNameTips = localize('msg.modal.button.sortByName');
        const sortByRepoTips = localize('msg.modal.button.sortByRepo');
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
            if (event.button.tooltip === localize('cmd.switchToSelectFolder')) {
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
                const list = await getWorkTreeList(item.path);
                return [list, item] as const;
            }),
        );
        list = worktreeList
            .map(([list, config]) => {
                return list.map<WorkTreeCacheItem>((row) => {
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
