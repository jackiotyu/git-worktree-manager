import * as vscode from 'vscode';
import { formatTime } from '@/core/util/parse';
import { checkGitValid } from '@/core/git/checkGitValid';
import { getAllRefList } from '@/core/git/getAllRefList';
import { Alert } from '@/core/ui/message';
import { backButton, deleteBranchQuickInputButton, renameBranchQuickInputButton } from './quickPick.button';
import { GlobalState } from '@/core/state';
import { refArgList, HEAD, Commands } from '@/constants';
import type { RefItem, RefList, RepoRefList, IPickBranch, IPickBranchResolveValue, BranchForWorktree } from '@/types';
import { getLastCommitHash } from '@/core/git/getLastCommitHash';
import { withResolvers } from '@/core/util/promise';
import { createBranchFrom } from '@/core/git/createBranch';
import { inputNewBranch } from '@/core/ui/inputNewBranch';
import { comparePath } from '@/core/util/folder';
import logger from '@/core/log/logger';

type ResolveValue = IPickBranchResolveValue;
type ResolveType = (value: ResolveValue) => void;
type RejectType = (value?: any) => void;

interface HandlerArgs {
    resolve: ResolveType;
    reject: RejectType;
    quickPick: vscode.QuickPick<BranchForWorktree>;
}

interface HideHanderArgs extends HandlerArgs {}

interface TriggerButtonHandlerArgs extends HandlerArgs {
    event: vscode.QuickInputButton;
}

interface HandleTriggerItemButtonArgs {
    event: vscode.QuickPickItemButtonEvent<BranchForWorktree>;
}

// Create a new branch
async function createBranchStrategy({
    cwd,
    mainFolder,
    showSelectRef,
    quickPick,
    resolve,
    showCreate,
}: {
    cwd: string;
    mainFolder: string;
    showSelectRef: boolean;
    quickPick: vscode.QuickPick<BranchForWorktree>;
    resolve: (value: ResolveValue) => void;
    showCreate: boolean;
}) {
    let branchItem: IPickBranchResolveValue = {};
    if (showSelectRef) {
        // selected ref
        branchItem = await pickBranch({
            title: vscode.l10n.t('Create new branch from...'),
            placeholder: vscode.l10n.t('Choose a reference to create new branch from'),
            mainFolder: mainFolder,
            cwd: cwd,
            showCreate: false,
        });
    }
    if (branchItem === false) {
        quickPick.dispose();
        resolve(false);
        return;
    }
    if (!branchItem) {
        updateQuickItems({ mainFolder, cwd, showCreate, quickPick });
        quickPick.show();
        return;
    }
    let branchName = await inputNewBranch(cwd);
    if (branchName === false) {
        quickPick.dispose();
        resolve(false);
        return;
    }
    if (!branchName) {
        updateQuickItems({ mainFolder, cwd, showCreate, quickPick });
        quickPick.show();
        return;
    }
    await createBranchFrom(cwd, branchName, branchItem.branch || branchItem.hash);
    const hash = await getLastCommitHash(cwd, true);
    resolve({ branch: branchName, hash });
    quickPick.hide();
    quickPick.dispose();
}

function isSelectCreateBranch(item: vscode.QuickPickItem) {
    return [createNewBranchItem, createNewBranchFromItem].includes(item);
}

async function handleAccept({
    resolve,
    reject,
    quickPick,
    cwd,
    mainFolder,
    showCreate,
}: HandlerArgs & { cwd: string; mainFolder: string; showCreate: boolean }) {
    try {
        const selected = quickPick.selectedItems[0];
        if (isSelectCreateBranch(selected)) {
            await createBranchStrategy({
                cwd,
                mainFolder,
                showSelectRef: selected === createNewBranchFromItem,
                quickPick,
                resolve,
                showCreate,
            });
            return;
        }
        resolve(selected);
        quickPick.hide();
        quickPick.dispose();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        reject(error);
    }
}

function handleHide({ resolve, reject, quickPick }: HideHanderArgs) {
    const selected = quickPick.selectedItems[0];
    if (isSelectCreateBranch(selected)) {
        return;
    }
    resolve(false);
    quickPick.dispose();
}

function handleTriggerButton({ resolve, reject, quickPick, event }: TriggerButtonHandlerArgs) {
    if (event === backButton) {
        resolve();
        quickPick.hide();
    }
}

function handleTriggerItemButton({ event }: HandleTriggerItemButtonArgs) {
    if (event.button === deleteBranchQuickInputButton) {
        vscode.commands.executeCommand(Commands.deleteBranch, event.item);
    } else if (event.button === renameBranchQuickInputButton) {
        vscode.commands.executeCommand(Commands.renameBranch, event.item);
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

const buildBranchDesc = (hash: string, authordate: string) =>
    `$(git-commit) ${hash} $(circle-small-filled) ${formatTime(authordate)}`;
const buildWorktreeBranchDesc = (hash: string, authordate: string) =>
    `$(git-commit) ${hash} $(circle-small-filled) ${formatTime(authordate)}`;
const buildRemoteBranchDesc = (hash: string, authordate: string) =>
    `${vscode.l10n.t('remote branch')} $(git-commit) ${hash} $(circle-small-filled) ${formatTime(authordate)}`;
const buildTagDesc = (hash: string, authordate: string) =>
    `${vscode.l10n.t('tag')} $(git-commit) ${hash} $(circle-small-filled) ${formatTime(authordate)}`;
const buildCommitDesc = (commitRef: RefItem): string | undefined => {
    const showReferenceDetails = vscode.workspace.getConfiguration('git').get('showReferenceDetails', false);
    const authorName = commitRef.authorname || commitRef['*authorname'] || commitRef.taggername;
    const subject = commitRef.subject || commitRef['*subject'];

    if (!showReferenceDetails || !authorName) return void 0;
    return `$(blank)  ${authorName} $(circle-small-filled) ${subject}`;
};

const mapBranchItemButtons = (): vscode.QuickInputButton[] => {
    const buttons: vscode.QuickInputButton[] = [
        { button: deleteBranchQuickInputButton, show: deleteBranchQuickInputButton.enabled },
        { button: renameBranchQuickInputButton, show: renameBranchQuickInputButton.enabled },
    ]
        .filter((i) => i.show)
        .map((i) => i.button);
    return buttons;
};

const mapBranchItems = (branchList: RefList, mainFolder: string): vscode.QuickPickItem[] => {
    const buttons: vscode.QuickInputButton[] = mapBranchItemButtons();
    const branchItems: BranchForWorktree[] = [
        {
            label: vscode.l10n.t('branch'),
            kind: vscode.QuickPickItemKind.Separator,
        },
        ...branchList.map<BranchForWorktree>((item) => {
            const shortRefName = item['refname'].replace('refs/heads/', '');
            return {
                label: shortRefName,
                description: buildBranchDesc(item['objectname:short'], item['authordate']),
                iconPath: new vscode.ThemeIcon('source-control'),
                hash: item['objectname:short'],
                branch: shortRefName,
                buttons,
                mainFolder,
                detail: buildCommitDesc(item),
            };
        }),
    ];
    return branchItems;
};

const mapWorktreeItemButtons = (): vscode.QuickInputButton[] => {
    const buttons: vscode.QuickInputButton[] = [
        { button: renameBranchQuickInputButton, show: renameBranchQuickInputButton.enabled },
    ]
        .filter((i) => i.show)
        .map((i) => i.button);
    return buttons;
};
const mapWorktreeBranchItems = (branchList: RefList, mainFolder: string, defaultBranch?: RefItem) => {
    const worktreeBranchItems: BranchForWorktree[] = [];
    worktreeBranchItems.push({
        label: 'worktree',
        kind: vscode.QuickPickItemKind.Separator,
    });
    defaultBranch &&
        worktreeBranchItems.push({
            label: `HEAD ${defaultBranch['objectname:short'] || ''}`,
            description: vscode.l10n.t('Current commit hash'),
            iconPath: new vscode.ThemeIcon('git-commit'),
            hash: defaultBranch['objectname:short'],
            detail: buildCommitDesc(defaultBranch),
        });
    const buttons: vscode.QuickInputButton[] = mapWorktreeItemButtons();
    worktreeBranchItems.push(
        // worktree branch list
        ...branchList.map((item) => {
            const shortName = item['refname'].replace('refs/heads/', '');
            return {
                label: shortName,
                description: buildWorktreeBranchDesc(item['objectname:short'], item['authordate']),
                iconPath:
                    item.HEAD === HEAD.current ? new vscode.ThemeIcon('check') : new vscode.ThemeIcon('source-control'),
                hash: item['objectname:short'],
                branch: shortName,
                buttons,
                mainFolder,
                detail: buildCommitDesc(item),
            };
        }),
    );
    return worktreeBranchItems;
};

const mapRemoteBranchItems = (remoteBranchList: RefList) => {
    const remoteBranchItems: BranchForWorktree[] = [
        {
            label: vscode.l10n.t('remote branch'),
            kind: vscode.QuickPickItemKind.Separator,
        },
        ...remoteBranchList.map<BranchForWorktree>((item) => {
            return {
                label: item['refname:short'],
                iconPath: new vscode.ThemeIcon('cloud'),
                description: buildRemoteBranchDesc(item['objectname:short'], item['authordate']),
                branch: item['refname:short'],
                detail: buildCommitDesc(item),
            };
        }),
    ];
    return remoteBranchItems;
};

const mapTagItems = (tagList: RefList) => {
    const tagItems: BranchForWorktree[] = [
        {
            label: vscode.l10n.t('tag'),
            kind: vscode.QuickPickItemKind.Separator,
        },
        ...tagList.map<BranchForWorktree>((item) => {
            const hash = (item['*objectname'] || item['objectname:short']).slice(0, 8);
            const authordate = item['*authordate'] || item['authordate'];
            return {
                label: item['refname'].replace('refs/tags/', ''),
                iconPath: new vscode.ThemeIcon('tag'),
                description: buildTagDesc(hash, authordate),
                hash,
                detail: buildCommitDesc(item),
            };
        }),
    ];
    return tagItems;
};

const createNewBranchItem: vscode.QuickPickItem = {
    label: `$(plus) ${vscode.l10n.t('Create new branch...')}`,
};
const createNewBranchFromItem: vscode.QuickPickItem = {
    label: `$(plus) ${vscode.l10n.t('Create new branch from...')}`,
};

const getPreItems = (showCreate: boolean): vscode.QuickPickItem[] => {
    if (!showCreate) return [];
    return [createNewBranchItem, createNewBranchFromItem, { label: '', kind: vscode.QuickPickItemKind.Separator }];
};

const mapRefItems = ({
    branchList,
    remoteBranchList,
    tagList,
    showCreate,
    mainFolder,
}: {
    branchList: RefList;
    remoteBranchList: RefList;
    tagList: RefList;
    showCreate: boolean;
    mainFolder: string;
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
        ...getPreItems(showCreate),
        ...mapWorktreeBranchItems(worktreeItems, mainFolder, defaultBranch),
        ...mapBranchItems(branchItems, mainFolder),
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
    if (!refList.branchList.length && !refList.remoteBranchList.length && !refList.tagList.length) {
        return false;
    }
    refList.branchList.some((item) => {
        if (!comparePath(item['worktreepath'], cwd)) return false;
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

const updateQuickItems = async ({
    mainFolder,
    cwd,
    showCreate,
    quickPick,
}: {
    mainFolder: string;
    cwd: string;
    showCreate: boolean;
    quickPick: vscode.QuickPick<BranchForWorktree>;
}) => {
    // Read cache
    const refList = await getRefListCache(mainFolder, cwd);
    if (refList) quickPick.items = mapRefItems({ ...refList, showCreate, mainFolder });
};

export const pickBranch: IPickBranch = async ({
    title,
    placeholder,
    mainFolder,
    cwd,
    step,
    totalSteps,
    showCreate,
}) => {
    const { resolve, reject, promise } = withResolvers<ResolveValue>();
    try {
        let isValidGit = await checkGitValid(cwd);
        if (!isValidGit) {
            Alert.showErrorMessage(vscode.l10n.t('The folder is not a valid Git repository'));
            return;
        }
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = title;
        quickPick.placeholder = placeholder;
        quickPick.canSelectMany = false;
        quickPick.buttons = [backButton];
        quickPick.step = step;
        quickPick.totalSteps = totalSteps;
        quickPick.onDidAccept(() => handleAccept({ resolve, reject, quickPick, cwd, mainFolder, showCreate }));
        quickPick.onDidHide(() => handleHide({ resolve, reject, quickPick }));
        quickPick.onDidTriggerButton((event) => handleTriggerButton({ resolve, reject, event, quickPick }));
        quickPick.onDidTriggerItemButton((event) => handleTriggerItemButton({ event }));
        // TODO 按名称排序
        quickPick.show();
        quickPick.busy = true;
        updateQuickItems({ mainFolder, cwd, showCreate, quickPick });
        const { branchList, remoteBranchList, tagList } = await getRefList(cwd);
        if (!branchList) {
            quickPick.hide();
            return;
        }
        updateRefListCache(mainFolder, {
            branchList,
            remoteBranchList,
            tagList,
        });
        updateQuickItems({ mainFolder, cwd, showCreate, quickPick });
        quickPick.busy = false;
        return await promise;
    } catch (error) {
        logger.error(error);
        reject(error);
    }
};
