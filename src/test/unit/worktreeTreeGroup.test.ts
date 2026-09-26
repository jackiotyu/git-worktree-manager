import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { TreeItemKind } from '../../constants';
import { WorktreeDataProvider } from '../../core/treeView/views/worktree';
import folderRoot from '../../core/folderRoot';
import * as worktreeListModule from '../../core/git/getWorktreeList';
import * as groupModule from '../../core/util/worktreeGroup';

let mainFolders: Array<{ name: string; path: string }> = [];

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    EventEmitter: class {
        event = () => ({ dispose: () => {} });
        fire() {}
        dispose() {}
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    Uri: { file: (fsPath: string) => ({ fsPath }) },
}));

rs.mock('../../core/treeView/items', () => ({
    WorkspaceMainGitFolderItem: class {
        type = TreeItemKind.workspaceGitMainFolder;
        parent = undefined;
        fsPath: string;
        constructor(path: string) {
            this.fsPath = path;
        }
    },
    WorktreeGroupItem: class {
        type = TreeItemKind.worktreeGroup;
        groupId: string;
        name: string;
        repositoryPath: string;
        children: unknown[] = [];
        parent?: unknown;
        constructor(group: { id: string; name: string; repositoryPath: string }, parent?: unknown) {
            this.groupId = group.id;
            this.name = group.name;
            this.repositoryPath = group.repositoryPath;
            this.parent = parent;
        }
    },
    WorktreeItem: class {
        type = TreeItemKind.worktree;
        fsPath: string;
        mainFolder: string;
        name: string;
        parent?: unknown;
        constructor(item: { path: string; mainFolder: string; name: string }, _collapsible: unknown, parent?: unknown) {
            this.fsPath = item.path;
            this.mainFolder = item.mainFolder;
            this.name = item.name;
            this.parent = parent;
        }
    },
}));

rs.mock('../../core/state', () => ({
    WorkspaceState: {
        get: (_key: string, defaultValue: unknown) => mainFolders || defaultValue,
    },
}));

rs.mock('../../core/folderRoot', () => ({
    default: { folderPathSet: new Set<string>() },
}));

rs.mock('../../core/git/getWorktreeList', () => ({
    getWorktreeList: rs.fn(),
}));

rs.mock('../../core/util/worktreeGroup', () => ({
    getRepositoryWorktreeGroups: rs.fn(),
}));
/* eslint-enable @typescript-eslint/naming-convention */

describe('WorktreeDataProvider groups', () => {
    const context = { subscriptions: { push: () => {} } } as any;

    beforeEach(() => {
        rs.clearAllMocks();
        mainFolders = [{ name: 'repo', path: '/repo' }];
        (folderRoot as any).folderPathSet = new Set(['/repo']);
        rs.mocked(worktreeListModule.getWorktreeList).mockResolvedValue([
            { path: '/repo', name: 'main', mainFolder: '/repo' },
            { path: '/repo.worktrees/grouped', name: 'grouped', mainFolder: '/repo' },
            { path: '/repo.worktrees/loose', name: 'loose', mainFolder: '/repo' },
        ] as any);
        rs.mocked(groupModule.getRepositoryWorktreeGroups).mockReturnValue([
            {
                id: 'zeta',
                name: 'Zeta',
                repositoryPath: '/repo',
                worktreePaths: ['/repo.worktrees/grouped'],
            },
            { id: 'alpha', name: 'Alpha', repositoryPath: '/repo', worktreePaths: [] },
        ]);
    });

    it('places alphabetical groups before ungrouped worktrees in a single repository', async () => {
        const provider = new WorktreeDataProvider(context);
        const items = (await provider.getChildren())!;

        expect(items.map((item: any) => item.name ?? item.fsPath)).toEqual(['Alpha', 'Zeta', 'main', 'loose']);
        const zeta = items[1] as any;
        expect(zeta.children.map((item: any) => item.fsPath)).toEqual(['/repo.worktrees/grouped']);
        expect(provider.getParent(zeta.children[0])).toBe(zeta);
    });

    it('nests groups under their repository in a multi-repository workspace', async () => {
        mainFolders = [
            { name: 'repo', path: '/repo' },
            { name: 'other', path: '/other' },
        ];
        (folderRoot as any).folderPathSet = new Set(['/repo', '/other']);
        const provider = new WorktreeDataProvider(context);
        const repositories = (await provider.getChildren())!;
        const repository = repositories[0] as any;
        const children = (await provider.getChildren(repository))!;
        const group = children.find((item: any) => item.name === 'Zeta') as any;

        expect(repository.type).toBe(TreeItemKind.workspaceGitMainFolder);
        expect(group.type).toBe(TreeItemKind.worktreeGroup);
        expect(provider.getParent(group)).toBe(repository);
        expect(provider.getParent(group.children[0])).toBe(group);
    });
});
