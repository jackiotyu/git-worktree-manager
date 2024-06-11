import * as vscode from 'vscode';
import { WorkspaceState } from '@/core/state';
import path from 'path';

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

type ResolveValue = readonly { name: string; path: string }[] | undefined | null;
type ResolveType = (value?: ResolveValue) => void;
type RejectType = (reason?: any) => void;
const showBaseNameQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('pass'),
    tooltip: vscode.l10n.t('Use base name'),
};
const showFullNameQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('pass-filled'),
    tooltip: vscode.l10n.t('Use full path'),
};

export const pickMultiFolder = async (gitFolders: string[]): Promise<ResolveValue> => {
    const fullNameOptions: vscode.QuickPickItem[] = gitFolders.map((folderPath) => ({ label: folderPath }));
    const baseNameOptions: vscode.QuickPickItem[] = gitFolders.map((folderPath) => ({
        label: path.basename(folderPath),
        description: folderPath,
    }));
    let resolve: ResolveType = () => {};
    let reject: RejectType = () => {};
    let waiting = new Promise<ResolveValue>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const picker = vscode.window.createQuickPick();
        picker.title = vscode.l10n.t('Select folder(s)');
        picker.items = baseNameOptions;
        picker.canSelectMany = true;
        picker.buttons = [showFullNameQuickInputButton];
        picker.onDidTriggerButton((event) => {
            if (event === showFullNameQuickInputButton) {
                picker.buttons = [showBaseNameQuickInputButton];
                picker.items = fullNameOptions;
            } else {
                picker.buttons = [showFullNameQuickInputButton];
                picker.items = baseNameOptions;
            }
        });
        picker.onDidHide(() => {
            resolve();
            picker.dispose();
        });
        picker.onDidAccept(() => {
            resolve(picker.selectedItems.map((item) => ({ name: item.label, path: item.description || item.label })));
            picker.dispose();
        });
        picker.show();
        return waiting;
    } catch (error) {
        return void 0;
    }
};
