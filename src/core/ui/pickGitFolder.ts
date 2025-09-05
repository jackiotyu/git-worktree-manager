import * as vscode from 'vscode';
import { WorkspaceState } from '@/core/state';
import path from 'path';
import { withResolvers } from '@/core/util/promise';

export const pickGitFolder = async (title: string): Promise<string | undefined | null> => {
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
            title,
            canPickMany: false,
        });
        return folderPath?.description;
    } else {
        return mainFolders[0];
    }
};

type ResolveValue = readonly { name: string; path: string }[] | void | null;
const showBaseNameQuickInputButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('pass'),
    tooltip: vscode.l10n.t('Use folder name'),
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
    const { resolve, reject, promise } = withResolvers<ResolveValue>();
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
        return promise;
    } catch (error) {
        return void 0;
    }
};
