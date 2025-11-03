import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import path from 'path';
import fs from 'fs/promises';
import { addToGitFolder } from '@/core/command/addToGitFolder';
import { addDirsToRepo } from '@/core/command/addDirsToRepo';

const addMultiGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the root directory containing multiple Git repositories'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    const dirs = await fs
        .readdir(folderPath, { encoding: 'utf-8' })
        .then((files) => files.map((fileName) => path.join(folderPath, fileName)))
        .catch(() => []);
    if (!dirs.length) return;
    return await addDirsToRepo(dirs);
};

const addSingleGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the Git repository folder path'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    await addToGitFolder(folderPath);
};

export const addGitFolderCmd = async () => {
    const multiLabel = vscode.l10n.t('Multiple repositories');
    const multiTips = vscode.l10n.t('Please select the root directory containing multiple Git repositories');
    const singleLabel = vscode.l10n.t('Single repository');
    const singleTips = vscode.l10n.t('Select Git repository to create worktree from');
    let options: vscode.QuickPickItem[] = [
        { label: multiLabel, iconPath: new vscode.ThemeIcon('checklist'), description: multiTips },
        { label: singleLabel, iconPath: new vscode.ThemeIcon('repo'), description: singleTips },
    ];
    let selected = await vscode.window.showQuickPick(options, {
        canPickMany: false,
        title: vscode.l10n.t('Add Git repository'),
    });
    if (!selected) return;
    if (selected.label === multiLabel) addMultiGitFolder();
    else addSingleGitFolder();
};
