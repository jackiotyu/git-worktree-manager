import * as vscode from 'vscode';
import { formatTime } from '@/core/util/parse';
import { checkGitValid } from '@/core/git/checkGitValid';
import { getAllRefList } from '@/core/git/getAllRefList';
import { Alert } from '@/core/ui/message';
import { backButton } from './quickPick.button';
import { GlobalState } from '@/core/state';
import { refArgList, HEAD } from '@/constants';
import type { RefItem, RefList, RepoRefList, IPickBranch, IPickBranchResolveValue, BranchForWorktree } from '@/types';
import { getLastCommitHash } from '@/core/git/getLastCommitHash';

type ResolveValue = IPickBranchResolveValue;
type ResolveType = (value: ResolveValue) => void;
type RejectType = (value?: any) => void;

interface HandlerArgs {
    resolve: ResolveType;
    reject: RejectType;
    quickPick: vscode.QuickPick<vscode.QuickPickItem>;
}

interface HideHanderArgs extends HandlerArgs {
    disposables: vscode.Disposable[];
}

interface TriggerButtonHandlerArgs extends HandlerArgs {
    event: vscode.QuickInputButton;
}

function handleAccept({ resolve, reject, quickPick }: HandlerArgs) {
    resolve(quickPick.selectedItems[0]);
    quickPick.hide();
}

function handleHide({ resolve, reject, quickPick, disposables }: HideHanderArgs) {
    resolve(false);
    disposables.forEach((i) => i.dispose());
    disposables.length = 0;
    quickPick.dispose();
}

function handleTriggerButton({ resolve, reject, quickPick, event }: TriggerButtonHandlerArgs) {
    if (event === backButton) {
        resolve();
        quickPick.hide();
    }
}

const mapRefList = (allRefList: RefList) => {
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
    return {
        branchList,
        remoteBranchList,
        tagList,
    };
};

const getRefList = async (cwd?: string) => {
    // 使用 git for-each-ref 获取所有分支和tag
    const allRefList = await getAllRefList([...refArgList], cwd);
    return mapRefList(allRefList);
};

const buildBranchDesc = (item: RefItem) =>
    `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(item.authordate)}`;
const buildWorktreeBranchDesc = (item: RefItem) =>
    `$(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(item.authordate)}`;
const buildRemoteBranchDesc = (item: RefItem) =>
    `${vscode.l10n.t('remote branch')} $(git-commit) ${item['objectname:short']} $(circle-small-filled) ${formatTime(
        item.authordate,
    )}`;
const buildTagDesc = (hash: string, authordate: string) =>
    `${vscode.l10n.t('tag')} $(git-commit) ${hash} $(circle-small-filled) ${formatTime(authordate)}`;

const mapBranchItems = (branchList: RefList) => {
    const branchItems: BranchForWorktree[] = [
        { label: vscode.l10n.t('branch'), kind: vscode.QuickPickItemKind.Separator },
        ...branchList.map((item) => {
            const shortRefName = item['refname'].replace('refs/heads/', '');
            return {
                label: shortRefName,
                description: buildBranchDesc(item),
                iconPath: new vscode.ThemeIcon('source-control'),
                hash: item['objectname:short'],
                branch: shortRefName,
            };
        }),
    ];
    return branchItems;
};

const mapWorktreeBranchItems = (branchList: RefList, defaultBranch?: RefItem) => {
    const worktreeBranchItems: BranchForWorktree[] = [];
    worktreeBranchItems.push({ label: 'worktree', kind: vscode.QuickPickItemKind.Separator });
    defaultBranch &&
        worktreeBranchItems.push({
            label: `HEAD ${defaultBranch['objectname:short'] || ''}`,
            description: vscode.l10n.t('Current commit hash'),
            iconPath: new vscode.ThemeIcon('git-commit'),
            hash: defaultBranch['objectname:short'],
        });
    worktreeBranchItems.push(
        // worktree branch list
        ...branchList.map((item) => {
            const shortName = item['refname'].replace('refs/heads/', '');
            return {
                label: shortName,
                description: buildWorktreeBranchDesc(item),
                iconPath:
                    item.HEAD === HEAD.current ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('source-control'),
                hash: item['objectname:short'],
                branch: shortName,
            };
        }),
    );
    return worktreeBranchItems;
};

const mapRemoteBranchItems = (remoteBranchList: RefList) => {
    const remoteBranchItems: BranchForWorktree[] = [
        { label: vscode.l10n.t('remote branch'), kind: vscode.QuickPickItemKind.Separator },
        ...remoteBranchList.map((item) => {
            return {
                label: item['refname:short'],
                iconPath: new vscode.ThemeIcon('cloud'),
                description: buildRemoteBranchDesc(item),
                branch: item['refname:short'],
            };
        }),
    ];
    return remoteBranchItems;
};

const mapTagItems = (tagList: RefList) => {
    const tagItems: BranchForWorktree[] = [
        { label: vscode.l10n.t('tag'), kind: vscode.QuickPickItemKind.Separator },
        ...tagList.map((item) => {
            const hash = (item['*objectname'] || item['objectname:short']).slice(0, 8);
            return {
                label: item['refname'].replace('refs/tags/', ''),
                iconPath: new vscode.ThemeIcon('tag'),
                description: buildTagDesc(hash, item['*authordate']),
                hash,
            };
        }),
    ];
    return tagItems;
};

const mapRefItems = ({
    branchList,
    remoteBranchList,
    tagList,
}: {
    branchList: RefList;
    remoteBranchList: RefList;
    tagList: RefList;
}) => {
    let defaultBranch: RefItem | undefined = void 0;
    let branchItems: RefList = [];
    let worktreeItems: RefList = [];
    branchList.forEach((item) => {
        if (item.HEAD === HEAD.current) defaultBranch = item;
        if (item.worktreepath) worktreeItems.push(item);
        else branchItems.push(item);
    });
    return [
        ...mapWorktreeBranchItems(worktreeItems, defaultBranch),
        ...mapBranchItems(branchItems),
        ...mapRemoteBranchItems(remoteBranchList),
        ...mapTagItems(tagList),
    ];
};

const getRefListCache = async (mainFolder: string, cwd: string) => {
    const refList = GlobalState.get(`global.gitRepo.refList.${mainFolder}`, {
        branchList: [],
        remoteBranchList: [],
        tagList: [],
    });
    if (!refList.branchList.length && !refList.remoteBranchList.length && !refList.tagList.length) return false;
    const hash = await getLastCommitHash(cwd, true);
    refList.branchList.some((item) => {
        if (item['objectname:short'] !== hash) return false;
        item.HEAD = HEAD.current;
        return true;
    });
    return refList;
};

const updateRefListCache = (mainFolder: string, refList: RepoRefList) => {
    const { branchList, remoteBranchList, tagList } = refList;
    const branchItems = branchList.map((item) => {
        if (item.HEAD !== HEAD.current) return item;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return { ...item, HEAD: ' ' };
    });
    // 添加缓存
    GlobalState.update(`global.gitRepo.refList.${mainFolder}`, {
        branchList: branchItems,
        remoteBranchList,
        tagList,
    });
};

export const pickBranch: IPickBranch = async (title, placeholder, mainFolder, cwd) => {
    let resolve: ResolveType = () => {};
    let reject: RejectType = () => {};
    let waiting = new Promise<ResolveValue>((_resolve, _reject) => {
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
            quickPick.onDidAccept(() => handleAccept({ resolve, reject, quickPick })),
            quickPick.onDidHide(() => handleHide({ resolve, reject, quickPick, disposables })),
            quickPick.onDidTriggerButton((event) => handleTriggerButton({ resolve, reject, event, quickPick })),
        );
        // TODO 按名称排序
        quickPick.show();
        quickPick.busy = true;
        // 读取缓存
        const refList = await getRefListCache(mainFolder, cwd);
        if (refList) quickPick.items = mapRefItems(refList);
        const { branchList, remoteBranchList, tagList } = await getRefList(cwd);
        if (!branchList) {
            quickPick.hide();
            return;
        }
        updateRefListCache(mainFolder, { branchList, remoteBranchList, tagList });
        quickPick.items = mapRefItems({ branchList, remoteBranchList, tagList });
        quickPick.busy = false;
        return await waiting;
    } catch (error) {
        console.log('pickBranch error ', error);
        reject(error);
    }
};
