import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import path from 'path';
import { RecentItemType } from '@/constants';
import { Config } from '@/core/config/setting';

export function judgeIsCurrentFolder(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path);
}

export function toSimplePath(path: string) {
    return path.toLowerCase().replace(/\\/g, '/');
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

export function getRecentItemIcon(type: RecentItemType): vscode.ThemeIcon {
    if (type === RecentItemType.folder) return vscode.ThemeIcon.Folder;
    else if (type === RecentItemType.file) return vscode.ThemeIcon.File;
    else if (type === RecentItemType.workspace) return new vscode.ThemeIcon('layers');
    return new vscode.ThemeIcon('info');
}

export function getGitFolderByUri(uri: vscode.Uri) {
    const repoPath = path.dirname(`${uri.fsPath.split('.git')[0]}.git`);
    return repoPath;
}

// get worktree base dir
export const getBaseWorktreeDir = (baseDir: string) => {
    const worktreePathTemplate = Config.get('worktreePathTemplate', '$BASE_PATH.worktrees');
    return worktreePathTemplate.replace('$BASE_PATH', baseDir).replace('$BASE_ROOT', path.dirname(baseDir));
};

// Validate template for invalid path characters
export const validateSubdirectoryTemplate = (template: string): boolean => {
    // Check for invalid path characters
    const invalidChars = /[/\\:*?"<>|]/;
    return !invalidChars.test(template);
};

// get worktree subdirectory name with baseName and index
export const getSubDir = (baseName: string, refName: string, index: string | number) => {
    const template = Config.get('worktreeSubdirectoryTemplate', '$BASE_NAME$INDEX');

    // Validate template
    if (!validateSubdirectoryTemplate(template)) {
        console.warn('Invalid worktree subdirectory template, using default');
        return `worktree${String(index)}`;
    }

    return template.replace('$BASE_NAME', baseName).replace('$REF_NAME', refName).replace('$INDEX', String(index));
};

export const getBaseBundleDir = (baseDir: string) => `${baseDir}.repoBackup`;

// find prefix path in list
export const findPrefixPath = (fsPath: string, strList: string[]) => {
    return strList.find((str) => fsPath.startsWith(str));
};

// check if child is a subpath of parent
export const isSubPath = (parent: string, child: string) => {
    const parentReal = path.resolve(parent);
    const childReal = path.resolve(child);
    if (parentReal === childReal) return false;
    const relative = path.relative(parentReal, childReal);
    return !relative.startsWith(`..${path.sep}`) && relative !== '..';
};
