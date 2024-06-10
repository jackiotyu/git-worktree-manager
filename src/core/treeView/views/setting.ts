import * as vscode from 'vscode';
import { ViewId, Commands } from '@/constants';

export class SettingDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    static readonly id = ViewId.settingList;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
        return [
            {
                label: vscode.l10n.t('Add Worktree'),
                iconPath: new vscode.ThemeIcon('new-folder'),
                command: {
                    command: Commands.addWorktree,
                    title: vscode.l10n.t('Add Worktree'),
                },
            },
            {
                label: vscode.l10n.t('Find Worktree'),
                iconPath: new vscode.ThemeIcon('search'),
                command: {
                    command: Commands.searchAllWorktree,
                    title: vscode.l10n.t('Find Worktree'),
                },
            },
            {
                label: vscode.l10n.t('Open Settings'),
                iconPath: new vscode.ThemeIcon('gear'),
                command: {
                    command: Commands.openSetting,
                    title: vscode.l10n.t('Open Settings'),
                },
            },
            {
                label: vscode.l10n.t('Report Issue'),
                iconPath: new vscode.ThemeIcon('issues'),
                command: {
                    command: 'vscode.open',
                    arguments: ['https://github.com/jackiotyu/git-worktree-manager/issues'],
                    title: vscode.l10n.t('Report Issue'),
                },
            },
        ];
    }
}
