import * as vscode from 'vscode';
import { ViewId, Commands } from '@/constants';

interface MenuItemConfig {
    label: string;
    icon: string;
    command: string | vscode.Command;
}

const menuItems: MenuItemConfig[] = [
    {
        label: vscode.l10n.t('Add Worktree'),
        icon: 'new-folder',
        command: Commands.addWorktree,
    },
    {
        label: vscode.l10n.t('Find Worktree'),
        icon: 'search',
        command: Commands.searchAllWorktree,
    },
    {
        label: vscode.l10n.t('Open Settings'),
        icon: 'gear',
        command: Commands.openSetting,
    },
    {
        label: vscode.l10n.t('Report Issue'),
        icon: 'issues',
        command: {
            command: 'vscode.open',
            title: '',
            arguments: [vscode.Uri.parse('https://github.com/jackiotyu/git-worktree-manager/issues')]
        },
    }
];

function createTreeItem(config: MenuItemConfig): vscode.TreeItem {
    const item = new vscode.TreeItem(config.label);
    item.iconPath = new vscode.ThemeIcon(config.icon);
    item.command = typeof config.command === 'string'
        ? { command: config.command, title: config.label }
        : config.command;

    return item;
}

export class SettingDataProvider implements vscode.TreeDataProvider<MenuItemConfig> {
    static readonly id = ViewId.settingList;
    private readonly items: MenuItemConfig[] = menuItems;

    getTreeItem(element: MenuItemConfig): vscode.TreeItem {
        return createTreeItem(element);
    }

    getChildren(): MenuItemConfig[] {
        return this.items;
    }
}
