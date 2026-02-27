import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import path from 'path';
import { RecentItemType } from '@/constants';
import { Config } from '@/core/config/setting';
import { toSimplePath, comparePath, findPrefixPath, isSubPath } from '@/core/util/path';

function judgeIsCurrentFolder(path: string) {
    return comparePath(folderRoot.uri?.fsPath, path);
}

function judgeIncludeFolder(path: string) {
    const normalizePath = toSimplePath(path);
    return folderRoot.folderPathSet.has(normalizePath);
}

function getFolderIcon(path: string, color?: vscode.ThemeColor) {
    return comparePath(folderRoot.uri?.fsPath, path)
        ? new vscode.ThemeIcon('check', color)
        : new vscode.ThemeIcon('window', color);
}

function getRecentItemIcon(type: RecentItemType): vscode.ThemeIcon {
    if (type === RecentItemType.folder) return vscode.ThemeIcon.Folder;
    else if (type === RecentItemType.file) return vscode.ThemeIcon.File;
    else if (type === RecentItemType.workspace) return new vscode.ThemeIcon('layers');
    return new vscode.ThemeIcon('info');
}

function getGitFolderByUri(uri: vscode.Uri) {
    const repoPath = path.dirname(`${uri.fsPath.split('.git')[0]}.git`);
    return repoPath;
}

// get worktree base dir
const getBaseWorktreeDir = (baseDir: string) => {
    const worktreePathTemplate = Config.get('worktreePathTemplate', '$BASE_PATH.worktrees');
    return worktreePathTemplate.replace('$BASE_PATH', baseDir).replace('$BASE_ROOT', path.dirname(baseDir));
};

// Validate template for invalid path characters
const validateSubdirectoryTemplate = (template: string): boolean => {
    // Check for invalid path characters
    const invalidChars = /[/\\:*?"<>|]/;
    return !invalidChars.test(template);
};

// get worktree subdirectory name with baseName and index
const getSubDir = (baseName: string, refName: string, index: string | number) => {
    const template = Config.get('worktreeSubdirectoryTemplate', '$BASE_NAME$INDEX');

    // Validate template
    if (!validateSubdirectoryTemplate(template)) {
        console.warn('Invalid worktree subdirectory template, using default');
        return `worktree${String(index)}`;
    }

    return template.replace('$BASE_NAME', baseName).replace('$REF_NAME', refName).replace('$INDEX', String(index));
};

const getBaseBundleDir = (baseDir: string) => `${baseDir}.repoBackup`;

export {
    toSimplePath,
    comparePath,
    findPrefixPath,
    isSubPath,
    judgeIsCurrentFolder,
    judgeIncludeFolder,
    getFolderIcon,
    getRecentItemIcon,
    getGitFolderByUri,
    getBaseWorktreeDir,
    getSubDir,
    getBaseBundleDir,
};
