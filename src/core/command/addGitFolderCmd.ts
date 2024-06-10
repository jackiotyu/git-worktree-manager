import * as vscode from "vscode";
import { Alert } from '@/core/ui/message';
import folderRoot from "@/core/folderRoot";
import path from "path";
import fs from 'fs/promises';
import { toSimplePath } from '@/core/util/folder';
import { getMainFolder } from '@/core/git/getMainFolder';
import { getFolderConfig, updateFolderConfig } from '@/core/util/state';
import { worktreeEventRegister } from '@/core/event/git';
import { addToGitFolder } from '@/core/command/addToGitFolder';

const addMultiGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the root directory of multiple git repositories'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    const files = await fs
        .readdir(folderPath, { encoding: 'utf-8' })
        .then((files) => files.map((fileName) => path.join(folderPath, fileName)))
        .catch(() => []);
    if(!files.length) return;
    const folders = await Promise.all(
        files.map(async (filePath) => {
            try {
                return toSimplePath((await getMainFolder(filePath)));
            } catch {
                return null;
            }
        }),
    );
    const existFolders = getFolderConfig();
    const distinctFolders = [...new Set(folders)];
    const existFoldersMap = new Map(existFolders.map((i) => [toSimplePath(i.path), true]));
    const gitFolders = distinctFolders.filter((i) => i && !existFoldersMap.has(i)) as string[];
    if (!gitFolders.length) return;
    const options: vscode.QuickPickItem[] = gitFolders.map((folderPath) => ({ label: folderPath }));
    const selected = await vscode.window.showQuickPick(options, {
        canPickMany: true,
        title: vscode.l10n.t('Select folder(s)'),
    });
    if (!selected) return;
    const selectGitFolders = selected.map((item) => item.label);
    const newFolders = getFolderConfig();
    newFolders.push(...selectGitFolders.map((i) => ({ name: i, path: i })));
    await updateFolderConfig(newFolders);
    selectGitFolders.forEach((folderPath) => worktreeEventRegister.add(vscode.Uri.file(folderPath)));
    Alert.showInformationMessage(vscode.l10n.t('Saved successfully'));
};

const addSingleGitFolder = async () => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: folderRoot.uri ? vscode.Uri.file(path.dirname(folderRoot.uri.fsPath)) : void 0,
        title: vscode.l10n.t('Please select the git repository folder path'),
    });
    if (!uriList?.length) return;
    let folderUri = uriList[0];
    let folderPath = folderUri.fsPath;
    await addToGitFolder(folderPath);
};

export const addGitFolderCmd = async () => {
    const multiLabel = vscode.l10n.t('Multiple repositories');
    const singleLabel = vscode.l10n.t('Single repository');
    let options: vscode.QuickPickItem[] = [
        { label: multiLabel, iconPath: new vscode.ThemeIcon('checklist') },
        { label: singleLabel, iconPath: new vscode.ThemeIcon('repo') }
    ];
    let selected = await vscode.window.showQuickPick(options, {
        canPickMany: false,
        title: vscode.l10n.t('Add git repository'),
    });
    if(!selected) return;
    if(selected.label === multiLabel) addMultiGitFolder();
    else addSingleGitFolder();
};