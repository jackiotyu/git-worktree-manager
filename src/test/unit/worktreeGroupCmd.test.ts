import { describe, expect, it, rs } from '@rstest/core';
import { TreeItemKind } from '../../constants';
import { resolveGroupRepositoryPath } from '../../core/command/worktreeGroupCmd';

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    window: { showInputBox: rs.fn(), showQuickPick: rs.fn() },
    l10n: { t: (text: string) => text },
    ThemeIcon: class {
        constructor() {}
    },
}));

rs.mock('../../core/ui/pickGitFolder', () => ({ pickGitFolder: rs.fn() }));

rs.mock('../../core/ui/message', () => ({ Alert: { showInformationMessage: rs.fn() } }));

rs.mock('../../core/ui/modal', () => ({ confirmModal: rs.fn() }));

rs.mock('../../core/util/worktreeGroup', () => ({
    assignWorktreeToGroup: rs.fn(),
    createWorktreeGroup: rs.fn(),
    deleteWorktreeGroup: rs.fn(),
    getRepositoryWorktreeGroups: rs.fn(() => []),
    hasWorktreeGroupName: rs.fn(() => false),
    renameWorktreeGroup: rs.fn(),
}));

rs.mock('../../core/treeView/items', () => ({
    WorkspaceMainGitFolderItem: class {},
    WorktreeGroupItem: class {},
    WorktreeItem: class {},
}));
/* eslint-enable @typescript-eslint/naming-convention */

describe('resolveGroupRepositoryPath', () => {
    it('uses the nested repository folder path instead of the worktree mainFolder', () => {
        // When a nested repository is a linked worktree, worktree.mainFolder points to the main repository and differs from the folder item
        const folder = { type: TreeItemKind.workspaceGitMainFolder, fsPath: '/repo/nested' };
        const item = {
            type: TreeItemKind.worktree,
            fsPath: '/repo/nested.worktrees/feature',
            mainFolder: '/repo',
            parent: folder,
        };

        expect(resolveGroupRepositoryPath(item as any)).toBe('/repo/nested');
    });

    it('resolves through a worktree group to its repository folder', () => {
        const folder = { type: TreeItemKind.workspaceGitMainFolder, fsPath: '/repo/nested' };
        const group = { type: TreeItemKind.worktreeGroup, parent: folder };
        const item = { type: TreeItemKind.worktree, fsPath: '/x', mainFolder: '/repo', parent: group };

        expect(resolveGroupRepositoryPath(item as any)).toBe('/repo/nested');
    });

    it('falls back to the worktree mainFolder without a repository folder parent', () => {
        const item = { type: TreeItemKind.worktree, fsPath: '/x', mainFolder: '/repo', parent: undefined };

        expect(resolveGroupRepositoryPath(item as any)).toBe('/repo');
    });
});
