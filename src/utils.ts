import * as vscode from 'vscode';
import folderRoot from '@/lib/folderRoot';
import { updateTreeDataEvent } from '@/lib/events';
import { WorkTreeOutputItem, WorkTreeDetail } from '@/types';
import localize from '@/localize';
import * as cp from 'child_process';
// 加载dayjs中文语言包
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as util from 'util';
dayjs.extend(relativeTime);
dayjs.locale(vscode.env.language); // 全局使用

const WORK_TREE = 'worktree';

const executeGitCommandBase: (cwd: string, args?: string[]) => string = (cwd, args) => {
    console.log('[executeGitCommand] ', ['git'].concat(args || []).join(' '));
    const proc = cp.spawnSync('git', args, {
        cwd,
    });
    const out = proc.stdout.toString();
    const err = proc.stderr.toString();
    console.log('[exec stderr] ', err);
    console.log('[exec stdout] ', out);
    if (!out && err) {
        throw Error(err);
    }
    return out;
};

const executeGitCommand: (args?: string[]) =>string = (args?: string[]) => {
    console.log(folderRoot.uri?.fsPath, 'fsPath');
    return executeGitCommandBase(folderRoot.uri?.fsPath || '', args);
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

export function getWorkTreeList(root?: string) {
    let cwd = root || folderRoot.uri?.fsPath || '';
    try {
        const output = executeGitCommandBase(cwd, ['worktree', 'list', '--porcelain']);
        const mainFolder = executeGitCommandBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']).replace('/.git', '');
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
        let detailList = (list as unknown as WorkTreeOutputItem[]).map((item) => {
            return {
                name: (item.branch || item.HEAD?.slice(0, 8) || '').replace('refs/heads/', ''),
                path: item.worktree,
                isBranch: !!item.branch,
                detached: Reflect.has(item, 'detached'),
                prunable: !!item.prunable,
                locked: Reflect.has(item, 'locked'),
                isMain: item.worktree.trim() === mainFolder.trim(),
            };
        });
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

export function getBranchList<T extends string>(keys: T[]) {
    try {
        let output = executeGitCommand(['branch', `--format=${formatQuery(keys)}`, '--sort=-worktreepath']);
        return parseOutput(output, keys);
    } catch {
        return [];
    }
}

export async function addWorkTree(path: string, branch: string) {
    try {
        executeGitCommand([WORK_TREE, 'add', path, branch]);
        return true;
    } catch (error: any) {
        vscode.window.showErrorMessage(localize('msg.error.addWorkTree', String(error)));
        return false;
    }
}

export function removeWorkTree(path: string) {
    return executeGitCommand([WORK_TREE, 'remove', path]);
}

export function repairWorkTree(path: string) {
    return executeGitCommand([WORK_TREE, 'repair', path]);
}

export function moveWorkTree(oldPath: string, newPath: string) {
    return executeGitCommand([WORK_TREE, 'move', oldPath, newPath]);
}

export function lockWorkTree(path: string) {
    return executeGitCommand([WORK_TREE, 'lock', path]);
}

export function unlockWorkTree(path: string) {
    return executeGitCommand([WORK_TREE, 'unlock', path]);
}

export function formatTime(time: string) {
    return dayjs(time).fromNow();
}

export function pruneWorkTree(dryRun: boolean = false) {
    try {
        executeGitCommand([WORK_TREE, 'prune', (dryRun ? '--dry-run' : ''), '-v'].filter(i => i));
        return [];
    } catch(error: any) {
        if(/Removing worktrees/.test(error.message)) {
            // TODO 处理成路径
            let text: string = error.message;
            let matched = text.matchAll(/Removing worktrees\/(.*):/g);
            let list = [];
            for(const worktreePath of matched) {
                list.push(worktreePath[1]);
            }
            return list;
        }
        throw error;
    }
}

export function checkGitValid(folderPath: string) {
    try {
        executeGitCommandBase(folderPath, ['log']);
        return true;
    }catch {
        return false;
    }
}