import * as vscode from 'vscode';
import folderRoot from './folderRoot';
import * as cp from "child_process";

export function comparePath(path1: string = '', path2: string = '') {
    return path1.toLocaleLowerCase().replace(/\\/g, '/') === path2.toLocaleLowerCase().replace(/\\/g, '/');
}

export function getFolderIcon(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path)
        ? new vscode.ThemeIcon('folder-active', new vscode.ThemeColor('badge.foreground'))
        : new vscode.ThemeIcon('folder', new vscode.ThemeColor('badge.foreground'));
}

export function getWorkTreeList () {
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

