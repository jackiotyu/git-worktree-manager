import * as vscode from 'vscode';
import folderRoot from '@/lib/folderRoot';
import { treeDataEvent, updateTreeDataEvent } from '@/lib/events';
import { IWorkTreeOutputItem, IWorkTreeDetail, IRecentlyOpened } from '@/types';
import localize from '@/localize';
import * as cp from 'child_process';
// 加载dayjs中文语言包
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as util from 'util';
import fs from 'fs/promises';
import { Alert } from '@/lib/adaptor/window';
import { actionProgressWrapper } from '@/lib/progress';
dayjs.extend(relativeTime);
dayjs.locale(vscode.env.language); // 全局使用

const WORK_TREE = 'worktree';

const executeGitCommandBase: (cwd: string, args?: string[]) => Promise<string> = (cwd, args) => {
    return new Promise((resolve, reject) => {
        console.log('[executeGitCommand] ', ['git'].concat(args || []).join(' '));
        const proc = cp.spawn('git', args, {
            cwd,
        });
        let out: Buffer = Buffer.from('', 'utf-8');
        let err: Buffer = Buffer.from('', 'utf-8');

        proc.stdout.on('data', (chunk) => {
            // console.log('[exec stdout] ', chunk.toString());
            out = Buffer.concat([out, chunk]);
        });
        proc.stderr.on('data', (chunk) => {
            // console.log('[exec stderr] ', chunk.toString());
            err = Buffer.concat([err, chunk]);
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
            console.log('[exec close] ', code);
            if (code === 0) {
                // console.log('[exec stdout] ', out.toString());
                resolve(out.toString());
            } else {
                console.log('[exec stderr] ', err.toString());
                reject(Error(err.toString()));
            }
        });
    });
};

export const openExternalTerminal = (path: string) => {
    return vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(path));
};

const executeGitCommand: (args?: string[]) => Promise<string> = (args?: string[]) => {
    console.log(folderRoot.uri?.fsPath, 'fsPath');
    return executeGitCommandBase(folderRoot.uri?.fsPath || '', args);
};

const executeGitCommandAuto = (cwd: string = '', args?: string[]) => {
    if (!cwd) {
        return executeGitCommand(args);
    }

    return executeGitCommandBase(cwd, args);
};

export function judgeIsCurrentFolder(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path);
}

export function comparePath(path1: string = '', path2: string = '') {
    return path1.toLocaleLowerCase().replace(/\\/g, '/') === path2.toLocaleLowerCase().replace(/\\/g, '/');
}

export function getFolderIcon(path: string, color?: vscode.ThemeColor) {
    return comparePath(folderRoot.uri?.fsPath, path)
        ? new vscode.ThemeIcon('folder-active', color)
        : new vscode.ThemeIcon('folder', color);
}

export async function getWorkTreeList(root?: string, skipRemote?: boolean): Promise<IWorkTreeDetail[]> {
    let cwd = root || folderRoot.uri?.fsPath || '';
    try {
        const [output, mainFolderFull, remoteBranchOutput] = await Promise.all([
            executeGitCommandBase(cwd, ['worktree', 'list', '--porcelain']),
            executeGitCommandBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
            skipRemote ? Promise.resolve('') : executeGitCommandBase(cwd, ['remote']),
        ]);

        const mainFolder = mainFolderFull.replace('/.git', '');
        const [remoteName] = remoteBranchOutput.split('\n');
        let list = output
            .split('\n')
            .reduce<string[][]>(
                (list, textLine) => {
                    if (textLine) {
                        list[list.length - 1].push(textLine);
                    } else {
                        list.push([]);
                    }

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
                const aheadBehind = !skipRemote && branchName
                    ? await getAheadBehindCommitCount(branchName, `${remoteName}/${branchName}`, item.worktree)
                    : void 0;
                return {
                    name: (item.branch || item.HEAD?.slice(0, 8) || '').replace('refs/heads/', ''),
                    path: item.worktree,
                    isBranch: !!item.branch,
                    detached: Reflect.has(item, 'detached'),
                    prunable: !!item.prunable,
                    locked: Reflect.has(item, 'locked'),
                    isMain: item.worktree.trim() === mainFolder.trim(),
                    ahead: aheadBehind?.ahead,
                    behind: aheadBehind?.behind,
                };
            }),
        );
        return detailList;
    } catch (error) {
        console.log('getWorkTreeList error', error);
        return [];
    }
}

export function formatQuery<T extends string>(keyList: T[]) {
    return [...new Set(keyList)].map((key) => `${key}="%(${key})"`).join(' ');
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

export async function getBranchList<T extends string>(keys: T[], cwd?: string) {
    try {
        let output = await executeGitCommandAuto(cwd, [
            'branch',
            `--format=${formatQuery(keys)}`,
            '--sort=-committerdate',
        ]);
        return parseOutput(output, keys);
    } catch {
        return [];
    }
}

export async function getRemoteBranchList<T extends string>(keys: T[], cwd?: string) {
    try {
        let output = await executeGitCommandAuto(cwd, [
            'branch',
            '-r',
            `--format=${formatQuery(keys)}`,
            '--sort=-committerdate',
        ]);
        return parseOutput(output, keys);
    } catch {
        return [];
    }
}

export async function getTagList<T extends string>(keys: T[], cwd?: string) {
    try {
        let output = await executeGitCommandAuto(cwd, [
            'tag',
            `--format=${formatQuery(keys)}`,
            '--sort=-committerdate',
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

export async function addWorkTree(path: string, branch: string, cwd?: string) {
    try {
        await executeGitCommandAuto(cwd, [WORK_TREE, 'add', '-f', path, branch]);
        return true;
    } catch (error: any) {
        Alert.showErrorMessage(localize('msg.error.addWorkTree', String(error)));
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
        let data = await executeGitCommandBase(cwd, ['rev-list', '--left-right', '--count', `${ref1}...${ref2}`, '--']);
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

export const checkoutBranch = (cwd: string, branchName: string, ...args: string[]) => {
    let list = [...args, branchName].filter((i) => i);
    return executeGitCommandAuto(cwd, ['switch', '--ignore-other-worktrees', ...list]);
};

export const pullBranch = (remoteName: string, branchName: string, remoteBranchName: string, cwd?: string) => {
    actionProgressWrapper(
        localize('cmd.pullWorkTree'),
        () => executeGitCommandAuto(cwd, ['pull', remoteName, `${remoteBranchName}:${branchName}`]),
        updateTreeDataEvent.fire.bind(updateTreeDataEvent),
    );
};

export const pushBranch = (remoteName: string, localBranchName: string, remoteBranchName: string, cwd?: string) => {
    actionProgressWrapper(
        localize('cmd.pushWorkTree'),
        () => executeGitCommandAuto(cwd, ['push', remoteName, `${localBranchName}:${remoteBranchName}`]),
        updateTreeDataEvent.fire.bind(updateTreeDataEvent),
    );
};

export const addToWorkspace = (path: string) => {
    let success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri: vscode.Uri.file(path),
        name: path,
    });
    if (success) {
        treeDataEvent.fire([]);
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

export const pullOrPushAction = async (action: 'pull' | 'push', branchName: string, cwd: string) => {
    const remoteBranchList = await getRemoteBranchList(['refname:short'], cwd);
    const item = remoteBranchList.find((row) => {
        const [remoteName, ...remoteBranchNameArgs] = row['refname:short'].split('/');
        return remoteBranchNameArgs.join('/').toLowerCase() === branchName.toLowerCase();
    });
    if (!item) {
        return false;
    }
    const [remoteName, ...remoteBranchNameArgs] = item['refname:short'].split('/');
    const remoteBranchName = remoteBranchNameArgs.join('/');
    return action === 'pull'
        ? pullBranch(remoteName, branchName, remoteBranchName, cwd)
        : pushBranch(remoteName, branchName, remoteBranchName, cwd);
};
