import * as vscode from 'vscode';
import { ViewId, Commands } from '@/constants';

export class SettingDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    static readonly id = ViewId.settingList;
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
        return [
            this.createTreeItem(vscode.l10n.t('Add Worktree'), 'new-folder', Commands.addWorktree),
            this.createTreeItem(vscode.l10n.t('Find Worktree'), 'search', Commands.searchAllWorktree),
            this.createTreeItem(vscode.l10n.t('Open Settings'), 'gear', Commands.openSetting),
            this.createTreeItem(vscode.l10n.t('Report Issue'), 'issues', {
                command: 'vscode.open',
                title: '',
                arguments: [vscode.Uri.parse('https://github.com/jackiotyu/git-worktree-manager/issues')],
            }),
        ];
    }
    private createTreeItem(label: string, icon: string, command: string | vscode.Command): vscode.TreeItem {
        return {
            label: label,
            iconPath: new vscode.ThemeIcon(icon),
            command: typeof command === 'string' ? { command: command, title: label } : command,
        };
    }
}
