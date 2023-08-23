import * as vscode from 'vscode';
import folderRoot from './folderRoot';
import * as cp from 'child_process';

export function comparePath(path1: string = '', path2: string = '') {
    return path1.toLocaleLowerCase().replace(/\\/g, '/') === path2.toLocaleLowerCase().replace(/\\/g, '/');
}

export function getFolderIcon(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path)
        ? new vscode.ThemeIcon('folder-active', new vscode.ThemeColor('badge.foreground'))
        : new vscode.ThemeIcon('folder', new vscode.ThemeColor('badge.foreground'));
}

export function getWorkTreeList() {
    if (!folderRoot.uri) {
        return [];
    }
    const proc = cp.spawnSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: folderRoot.uri.fsPath,
    });
    let regex = /worktree (.*)\s*.*\s*branch refs\/heads\/(.*)/g;
    let matches = String(proc.stdout).matchAll(regex);
    let workTrees = [];
    for (const match of matches) {
        workTrees.push({ name: match[2], path: match[1] });
    }
    return workTrees;
}

export function formatQuery(keyList: string[]) {
    return [...new Set(keyList)].map((key) => `${key}="%(${key})"`).join(' ');
}

export function parseOutput(output: string, keyList: string[]) {
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

export function getBranchList(keys: string[]) {
    if (!folderRoot.uri) {
        return {};
    }
    const proc = cp.spawnSync('git', ['branch', `--format=${formatQuery(keys)}`], {
        cwd: folderRoot.uri.fsPath,
    });
    if (proc.stderr.toString()) {
        return {};
    }
    return parseOutput(proc.stdout.toString(), keys);
}
