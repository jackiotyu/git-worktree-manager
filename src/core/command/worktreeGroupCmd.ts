import * as vscode from 'vscode';
import { WorkspaceMainGitFolderItem, WorktreeGroupItem, WorktreeItem } from '@/core/treeView/items';
import { pickGitFolder } from '@/core/ui/pickGitFolder';
import { Alert } from '@/core/ui/message';
import { confirmModal } from '@/core/ui/modal';
import {
    assignWorktreeToGroup,
    createWorktreeGroup,
    deleteWorktreeGroup,
    getRepositoryWorktreeGroups,
    hasWorktreeGroupName,
    renameWorktreeGroup,
} from '@/core/util/worktreeGroup';

const inputGroupName = async (repositoryPath: string, current?: WorktreeGroupItem) => {
    const value = current?.name ?? '';
    return vscode.window.showInputBox({
        title: current ? vscode.l10n.t('Rename Worktree Group') : vscode.l10n.t('Create Worktree Group'),
        prompt: vscode.l10n.t('Enter a name for the worktree group'),
        value,
        valueSelection: current ? [0, value.length] : undefined,
        validateInput(input) {
            const name = input.trim();
            if (!name) return vscode.l10n.t('Group name cannot be empty');
            if (hasWorktreeGroupName(repositoryPath, name, current?.groupId)) {
                return vscode.l10n.t('A group with this name already exists in the repository');
            }
        },
    });
};

export const createWorktreeGroupCmd = async (item?: WorkspaceMainGitFolderItem) => {
    const repositoryPath =
        item?.fsPath ?? (await pickGitFolder(vscode.l10n.t('Select Git repository for the worktree group')));
    if (!repositoryPath) return;

    const name = await inputGroupName(repositoryPath);
    if (!name) return;
    const group = await createWorktreeGroup(repositoryPath, name);
    if (group) Alert.showInformationMessage(vscode.l10n.t('Worktree group created'));
};

export const renameWorktreeGroupCmd = async (item?: WorktreeGroupItem) => {
    if (!item) return;
    const name = await inputGroupName(item.repositoryPath, item);
    if (!name || name.trim() === item.name) return;
    if (await renameWorktreeGroup(item.groupId, name)) {
        Alert.showInformationMessage(vscode.l10n.t('Worktree group renamed'));
    }
};

export const deleteWorktreeGroupCmd = async (item?: WorktreeGroupItem) => {
    if (!item) return;
    const confirmed = await confirmModal(
        vscode.l10n.t('Delete Worktree Group'),
        vscode.l10n.t('Delete'),
        vscode.l10n.t('Delete the group "{0}"? Its worktrees will remain available as ungrouped items.', item.name),
    );
    if (!confirmed) return;
    await deleteWorktreeGroup(item.groupId);
    Alert.showInformationMessage(vscode.l10n.t('Worktree group deleted'));
};

type GroupQuickPickItem = vscode.QuickPickItem & { groupId?: string };

export const assignWorktreeGroupCmd = async (item?: WorktreeItem) => {
    if (!item) return;
    const groups = getRepositoryWorktreeGroups(item.mainFolder).sort((a, b) => a.name.localeCompare(b.name));
    if (!groups.length) {
        Alert.showInformationMessage(vscode.l10n.t('Create a worktree group before assigning worktrees'));
        return;
    }

    const ungrouped: GroupQuickPickItem = {
        label: vscode.l10n.t('Ungrouped'),
        iconPath: new vscode.ThemeIcon('circle-slash'),
    };
    const selected = await vscode.window.showQuickPick<GroupQuickPickItem>(
        [
            ungrouped,
            ...groups.map((group) => ({
                label: group.name,
                groupId: group.id,
                iconPath: new vscode.ThemeIcon('folder-library'),
            })),
        ],
        {
            title: vscode.l10n.t('Assign {0} to a worktree group', item.name),
            placeHolder: vscode.l10n.t('Select a group or choose Ungrouped'),
        },
    );
    if (!selected) return;
    await assignWorktreeToGroup(item.mainFolder, item.fsPath, selected.groupId);
};
