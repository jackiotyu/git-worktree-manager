import * as vscode from 'vscode';
import folderRoot from '@/lib/folderRoot';
import { treeDataEvent } from '@/lib/events';
import { IWorkTreeOutputItem, IWorkTreeDetail, IRecentlyOpened, IFolderItemConfig, IWorkTreeCacheItem } from '@/types';
import * as cp from 'child_process';
// 加载dayjs中文语言包
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as util from 'util';
import fs from 'fs/promises';
import path from 'path';
import open from 'open';
import { Alert } from '@/lib/adaptor/window';
import { actionProgressWrapper } from '@/lib/progress';
import treeKill = require('tree-kill');
import logger from './lib/logger';
import { GlobalState, WorkspaceState } from '@/lib/globalState';
import { Config } from '@/lib/adaptor/config';
dayjs.extend(relativeTime);
dayjs.locale(vscode.env.language); // 全局使用

type PullPushArgs = {
    remote: string;
    branch: string;
    remoteRef: string;
    cwd: string;
};

const WORK_TREE = 'worktree';

const executeGitCommandBase = (cwd: string, args?: string[], token?: vscode.CancellationToken): Promise<string> => {
    return new Promise((resolve, reject) => {
        logger.log(`'Running in' ${cwd}`);
        logger.log(`> ${['git'].concat(args || []).join(' ')}`);
        const proc = cp.spawn('git', args, {
            cwd,
        });
        let out: Buffer = Buffer.from('', 'utf-8');
        let err: Buffer = Buffer.from('', 'utf-8');

        proc.stdout.on('data', (chunk) => {
            out = Buffer.concat([out, chunk]);
            logger.trace(chunk.toString());
        });
        proc.stderr.on('data', (chunk) => {
            err = Buffer.concat([err, chunk]);
            logger.error(chunk.toString());
        });
        token?.onCancellationRequested(() => {
            proc.kill('SIGTERM');
            if (proc.pid) {
                treeKill(proc.pid, 'SIGTERM');
            }
        });
        proc.once('error', reject);
        proc.once('close', (code, signal) => {
            logger.trace('[exec close] ', code, signal);
            if (signal === 'SIGTERM') {
                return resolve('');
            }
            if (code === 0) {
                resolve(out.toString());
            } else {
                reject(Error(err.toString()));
            }
        });
    });
};

export const openExternalTerminal = (path: string) => {
    return vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(path));
};

const executeGitCommand = (args?: string[], token?: vscode.CancellationToken): Promise<string> => {
    return executeGitCommandBase(folderRoot.uri?.fsPath || '', args, token);
};

const executeGitCommandAuto = (cwd: string = '', args?: string[], token?: vscode.CancellationToken) => {
    if (!cwd) return executeGitCommand(args, token);
    return executeGitCommandBase(cwd, args, token);
};

export function judgeIsCurrentFolder(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path);
}

export function toSimplePath(path: string) {
    return path.toLocaleLowerCase().replace(/\\/g, '/');
}

export function judgeIncludeFolder(path: string) {
    const normalizePath = toSimplePath(path);
    return folderRoot.folderPathSet.has(normalizePath);
}

export function comparePath(path1: string = '', path2: string = '') {
    return toSimplePath(path1) === toSimplePath(path2);
}

export function getFolderIcon(path: string, color?: vscode.ThemeColor) {
    return comparePath(folderRoot.uri?.fsPath, path)
        ? new vscode.ThemeIcon('check', color)
        : new vscode.ThemeIcon('window', color);
}

export function getNameRev(cwd: string) {
    return executeGitCommandBase(cwd, ['describe', '--all']);
}

export async function getWorkTreeList(root?: string, skipRemote?: boolean): Promise<IWorkTreeDetail[]> {
    let cwd = root || folderRoot.uri?.fsPath || '';
    try {
        const [output, mainFolderFull, remoteBranchOutput, branchList] = await Promise.all([
            executeGitCommandBase(cwd, ['worktree', 'list', '--porcelain']),
            executeGitCommandBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
            skipRemote ? Promise.resolve('') : executeGitCommandBase(cwd, ['remote']),
            skipRemote
                ? Promise.resolve([])
                : getAllRefList(['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'], cwd),
        ]);

        const mainFolder = mainFolderFull.replace('/.git', '');
        const [remoteName] = remoteBranchOutput.split('\n');
        const remoteBranchMap = new Map(
            branchList.filter((item) => item['upstream:remoteref']).map((item) => [item.refname, item]),
        );
        let list = output
            .split('\n')
            .reduce<string[][]>(
                (list, textLine) => {
                    if (textLine) list[list.length - 1].push(textLine);
                    else list.push([]);
                    return list;
                },
                [[]],
            )
            .filter((i) => i.length)
            .map((item) => {
                let itemList = item.map<[string, string]>((text) => {
                    let split = text.split(' ');
                    return [split[0], split.slice(1).join(' ')];
                });
                return new Map<string, string | void>(itemList);
            })
            .map((mapItem) => Object.fromEntries(mapItem));
        let detailList = await Promise.all(
            (list as unknown as IWorkTreeOutputItem[]).map(async (item) => {
                const branchName = item.branch?.replace('refs/heads/', '') || '';
                const remoteTrackItem = item.branch ? remoteBranchMap.get(item.branch) : void 0;
                const remoteRef = remoteTrackItem?.['upstream:remoteref'].replace('refs/heads/', '');
                const remote = remoteTrackItem?.['upstream:remotename'];
                const remoteBranchName = `${remote}/${remoteRef}`;
                const hasRemote = item.branch ? remoteBranchMap.has(item.branch) : false;
                const [aheadBehind, nameRev] = await Promise.all([
                    !skipRemote && branchName && remoteName && hasRemote
                        ? getAheadBehindCommitCount(
                              item.branch || '',
                              `refs/remotes/${remoteBranchName}`,
                              item.worktree,
                          )
                        : Promise.resolve(void 0),
                    !branchName ? getNameRev(item.worktree) : Promise.resolve(''),
                ]);
                const isRemoteRev = /^remotes\//.test(nameRev);
                const isTag = /^tags\/[^~]+/.test(nameRev);
                let name = branchName;
                if (!name) {
                    name =
                        isRemoteRev || /^heads\//.test(nameRev)
                            ? item.HEAD?.slice(0, 8)
                            : nameRev
                                  .replace(/^tags\//, '')
                                  .replace(/^heads\//, '')
                                  .trim();
                }
                return {
                    name,
                    path: item.worktree,
                    isBranch: !!branchName,
                    isTag,
                    detached: Reflect.has(item, 'detached'),
                    prunable: !!item.prunable,
                    locked: Reflect.has(item, 'locked'),
                    isMain: item.worktree.trim() === mainFolder.trim(),
                    ahead: aheadBehind?.ahead,
                    behind: aheadBehind?.behind,
                    hash: item.HEAD,
                    remoteRef,
                    remote,
                };
            }),
        );
        return detailList;
    } catch (error) {
        logger.error(error);
        return [];
    }
}

export function formatQuery<T extends string>(keyList: T[]) {
    return [...new Set(keyList)].map((key) => `${key}="%(${key})"`).join(' ');
}

export function formatSimpleQuery<T extends string>(keyList: T[]) {
    return [...new Set(keyList)].map((key) => `${key}="%${key}"`).join(' ');
}

export function parseOutput<T extends string>(output: string, keyList: T[]): Record<T, string>[] {
    let tokenList = [...new Set(keyList)];
    let regex = tokenList.map((key) => `${key}="(.*)"`).join(' ');
    let workTrees = [];
    let matches = output.matchAll(new RegExp(regex, 'g'));
    for (const match of matches) {
        let item = tokenList.reduce<Record<string, string>>((obj, key, index) => {
            obj[key] = match[index + 1];
            return obj;
        }, {});
        workTrees.push(item);
    }
    return workTrees;
}

export async function getAllRefList<T extends string>(keys: T[], cwd?: string, args?: string[]) {
    try {
        let output = await executeGitCommandAuto(cwd, [
            'for-each-ref',
            `--format=${formatQuery(keys)}`,
            '--sort=-refname:lstrip=2',
            '--sort=-committerdate',
            ...(args || []),
        ]);
        return parseOutput(output, keys);
    } catch {
        return [];
    }
}

export async function getRemoteList(cwd: string) {
    try {
        let output = await executeGitCommandAuto(cwd, ['remote', '-v']);
        return output.split('\n').filter((i) => i);
    } catch {
        return [];
    }
}

export async function addWorkTree(path: string, branch: string, isBranch: boolean, cwd?: string) {
    try {
        await executeGitCommandAuto(cwd, [WORK_TREE, 'add', '-f', '--guess-remote', path, branch]);
        await checkoutBranch(path, branch, isBranch);
        return true;
    } catch (error: any) {
        Alert.showErrorMessage(vscode.l10n.t('Failed to create Worktree\n{0}', String(error)));
        return false;
    }
}

export function removeWorkTree(path: string, cwd?: string) {
    return executeGitCommandAuto(cwd, [WORK_TREE, 'remove', path]);
}

export function repairWorkTree(path: string, cwd?: string) {
    return executeGitCommandAuto(cwd, [WORK_TREE, 'repair', path]);
}

export function moveWorkTree(oldPath: string, newPath: string, cwd?: string) {
    return executeGitCommandAuto(cwd, [WORK_TREE, 'move', oldPath, newPath]);
}

export function lockWorkTree(path: string, cwd?: string) {
    return executeGitCommandAuto(cwd, [WORK_TREE, 'lock', path]);
}

export function unlockWorkTree(path: string, cwd?: string) {
    return executeGitCommandAuto(cwd, [WORK_TREE, 'unlock', path]);
}

export function formatTime(time: string) {
    return dayjs(time).fromNow();
}

export async function pruneWorkTree(dryRun: boolean = false, cwd?: string) {
    try {
        await executeGitCommandAuto(
            cwd,
            [WORK_TREE, 'prune', dryRun ? '--dry-run' : '', '-v'].filter((i) => i),
        );
        return [];
    } catch (error: any) {
        if (/Removing worktrees/.test(error.message)) {
            let text: string = error.message;
            let matched = text.matchAll(/Removing worktrees\/(.*):/g);
            let list = [];
            for (const worktreePath of matched) {
                list.push(worktreePath[1]);
            }

            return list;
        }
        throw error;
    }
}

// Fork from https://github.com/gitkraken/vscode-gitlens/blob/2fd2bbbe328fbe66f879b78a61cab6df65181452/src/env/node/git/git.ts#L1660
export async function getAheadBehindCommitCount(ref1: string, ref2: string, cwd: string) {
    try {
        const closeAheadBehindNumber = Config.get('closeAheadBehindNumber', false);
        let data = await executeGitCommandBase(cwd, [
            'rev-list',
            '--left-right',
            '--count',
            closeAheadBehindNumber ? `--max-count=${1}` : '',
            `${ref1}...${ref2}`,
            '--',
        ].filter(i => i));
        if (data.length === 0) return undefined;
        const parts = data.split('\t');
        if (parts.length !== 2) return undefined;
        const [ahead, behind] = parts;
        const result = {
            ahead: parseInt(ahead, 10),
            behind: parseInt(behind, 10),
        };
        if (isNaN(result.ahead) || isNaN(result.behind)) return undefined;
        return result;
    } catch {
        return void 0;
    }
}

export async function checkGitValid(folderPath: string = folderRoot.uri?.fsPath || '') {
    try {
        await executeGitCommandBase(folderPath, ['rev-parse', '--is-inside-work-tree']);
        return true;
    } catch {
        return false;
    }
}

export const getMainFolder = async (cwd: string) => {
    try {
        const mainFolderFull = await executeGitCommandBase(cwd, [
            'rev-parse',
            '--path-format=absolute',
            '--git-common-dir',
        ]);
        return mainFolderFull.trim().replace(/\/.git$/, '');
    } catch {
        return '';
    }
};

export const checkoutBranch = async (cwd: string, branchName: string, isBranch: boolean) => {
    const refList = await getAllRefList(
        ['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'],
        cwd,
        ['--sort=-upstream'],
    );
    const remoteBranchList = refList.filter((i) => /^refs\/remotes/.test(i.refname));
    // 当前为远程分支名
    if (remoteBranchList.some((i) => i['refname:short'] === branchName)) {
        const trackingBranch = refList.find((branch) => {
            if (!branch['upstream:remoteref']) return false;
            const remoteName = branch['upstream:remotename'];
            const refname = branch['refname:short'];
            // 已有本地分支与远程分支关联
            return `${remoteName}/${refname}` === branchName;
        });
        // 判断是否已建立该分支
        if (trackingBranch) {
            // 需要使用本地分支名
            const localBranchName = trackingBranch['refname:short'];
            const list = [isBranch ? '' : '--detach', localBranchName].filter((i) => i);
            return executeGitCommandAuto(cwd, ['switch', '--ignore-other-worktrees', ...list]);
        } else {
            // FIXME 自动新建关联远程分支
            return executeGitCommandAuto(cwd, ['checkout', '-q', '--track', branchName]);
        }
    } else {
        const list = [isBranch ? '' : '--detach', branchName].filter((i) => i);
        return executeGitCommandAuto(cwd, ['switch', '--ignore-other-worktrees', ...list]);
    }
};

export const pullBranch = ({ remote, branch, remoteRef, cwd }: PullPushArgs) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Pull commit ( {0} → {1} ) on {2}', `${remote}/${remoteRef}`, branch, cwd),
        () => executeGitCommandAuto(cwd, ['pull', remote, `${remoteRef}:${branch}`], token.token),
        () => {},
        token,
    );
};

export const pushBranch = ({ remote, branch, remoteRef, cwd }: PullPushArgs) => {
    const token = new vscode.CancellationTokenSource();
    actionProgressWrapper(
        vscode.l10n.t('Push commit ( {0} → {1} ) on {2}', branch, `${remote}/${remoteRef}`, cwd),
        () => executeGitCommandAuto(cwd, ['push', remote, `${remoteRef}:${branch}`], token.token),
        () => {},
        token,
    );
};

export const addToWorkspace = (path: string) => {
    let success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(path),
        name: path,
    });
    if (success) {
        treeDataEvent.fire();
    }
};

export const removeFromWorkspace = (path: string) => {
    if (!vscode.workspace.workspaceFolders) return;
    let index = vscode.workspace.workspaceFolders.findIndex((item) => comparePath(item.uri.fsPath, path));
    if (index >= 0) {
        vscode.workspace.updateWorkspaceFolders(index, 1);
    }
};

export const getRecentFolders = async () => {
    let data = (await vscode.commands.executeCommand('_workbench.getRecentlyOpened')) as IRecentlyOpened;
    return data.workspaces.filter((item) => item.folderUri && item.folderUri.scheme === 'file');
};

export const checkExist = (path: string) => {
    return fs
        .stat(path)
        .then(() => true)
        .catch(() => false);
};

export const pullOrPushAction = async (action: 'pull' | 'push', options: PullPushArgs) => {
    return action === 'pull' ? pullBranch(options) : pushBranch(options);
};

export const getLashCommitDetail = async <T extends string>(
    cwd: string,
    keys: T[],
): Promise<Record<T, string | void>> => {
    try {
        let output = await executeGitCommandAuto(cwd, ['log', '-1', `--pretty=format:${formatSimpleQuery(keys)}`]);
        return parseOutput(output, keys)[0];
    } catch {
        return {} as Record<T, void>;
    }
};

export const getWorktreeStatus = (item: IWorkTreeDetail) => {
    if (item.ahead && item.behind) return 'diverged';
    if (item.ahead) return 'ahead';
    if (item.behind) return 'behind';
    return 'upToDate';
};

const getWorkspaceMainFolders = async (): Promise<IFolderItemConfig[]> => {
    const list = await Promise.all([...folderRoot.folderPathSet].map(async (folder) => await getMainFolder(folder)));
    const folders = [...new Set(list.filter((i) => i))].map((folder) => ({
        name: path.basename(folder),
        path: folder,
    }));
    return folders;
};

export const pickGitFolder = async (): Promise<string | undefined | null> => {
    const mainFolders = WorkspaceState.get('mainFolders', []).map((i) => i.path);
    if (mainFolders.length === 0) return null;
    if (mainFolders.length > 1) {
        const items: vscode.QuickPickItem[] = [
            ...mainFolders.map<vscode.QuickPickItem>((folderPath) => {
                return {
                    label: path.basename(folderPath),
                    description: folderPath,
                    iconPath: new vscode.ThemeIcon('repo'),
                };
            }),
        ];
        const folderPath = await vscode.window.showQuickPick(items, {
            title: vscode.l10n.t('Select git repository for create worktree'),
            canPickMany: false,
        });
        return folderPath?.description;
    } else {
        return mainFolders[0];
    }
};

export const gitFolderToCaches = async (gitFolders: IFolderItemConfig[]): Promise<IWorkTreeCacheItem[]> => {
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

export const updateWorkspaceMainFolders = async () => {
    const folders = await getWorkspaceMainFolders();
    WorkspaceState.update('mainFolders', folders);
};

export const updateWorkTreeCache = async () => {
    const gitFolders = GlobalState.get('gitFolders', []);
    let list: IWorkTreeCacheItem[] = await gitFolderToCaches(gitFolders);
    GlobalState.update('workTreeCache', list);
};

export const updateWorkspaceListCache = async () => {
    if (WorkspaceState.get('mainFolders', []).length === 0) {
        await updateWorkspaceMainFolders();
    }
    const mainFolders = WorkspaceState.get('mainFolders', []);
    const cache = await gitFolderToCaches(mainFolders);
    WorkspaceState.update('workTreeCache', cache);
};

export const revealFolderInOS = (folder: string) => {
    open(folder);
};