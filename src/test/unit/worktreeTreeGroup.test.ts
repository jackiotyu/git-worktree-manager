import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { TreeItemKind } from '../../constants';
import { WorktreeDataProvider } from '../../core/treeView/views/worktree';
import folderRoot from '../../core/folderRoot';
import * as worktreeListModule from '../../core/git/getWorktreeList';
import * as groupModule from '../../core/util/worktreeGroup';
import type { WorktreeSortOrder } from '../../types';

let mainFolders: Array<{ name: string; path: string }> = [];
let nestedRepos: string[] = [];
let sortOrder: WorktreeSortOrder = 'default';

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('../../core/config/setting', () => ({
    Config: { get: () => sortOrder },
}));

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
        options: unknown;
        nested: boolean;
        constructor(path: string, _collapsible?: unknown, options?: { nested?: boolean }) {
            this.fsPath = path;
            this.options = options;
            this.nested = Boolean(options?.nested);
        }
    },
    NestedRepoGroupItem: class {
        type = TreeItemKind.nestedRepoGroup;
        id = 'git-worktree-manager.nestedRepoGroup';
        contextValue = 'git-worktree-manager.nestedRepoGroup';
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
        inWorkspace: boolean;
        constructor(
            item: { path: string; mainFolder: string; name: string },
            _collapsible: unknown,
            parent?: unknown,
            inWorkspace = false,
        ) {
            this.fsPath = item.path;
            this.mainFolder = item.mainFolder;
            this.name = item.name;
            this.parent = parent;
            this.inWorkspace = inWorkspace;
        }
    },
}));

rs.mock('../../core/state', () => ({
    WorkspaceState: {
        get: (key: string, defaultValue: unknown) => {
            if (key === 'mainFolders') return mainFolders;
            if (key === 'workspaceNestedRepos') return nestedRepos;
            return defaultValue;
        },
    },
}));

rs.mock('../../core/util/file', () => ({
    checkIsFolder: rs.fn().mockResolvedValue(true),
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
        sortOrder = 'default';
        nestedRepos = [];
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

    it('places alphabetical groups before ungrouped worktrees in Git order by default', async () => {
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

    it('applies the selected order within groups and to ungrouped worktrees after a preference change', async () => {
        rs.mocked(worktreeListModule.getWorktreeList).mockResolvedValue([
            { path: '/repo', name: 'main', mainFolder: '/repo' },
            { path: '/repo.worktrees/grouped', name: 'feature-10', mainFolder: '/repo' },
            { path: '/repo.worktrees/second', name: 'feature-2', mainFolder: '/repo' },
            { path: '/repo.worktrees/loose', name: 'loose', mainFolder: '/repo' },
        ] as any);
        rs.mocked(groupModule.getRepositoryWorktreeGroups).mockReturnValue([
            {
                id: 'group',
                name: 'Group',
                repositoryPath: '/repo',
                worktreePaths: ['/repo.worktrees/grouped', '/repo.worktrees/second'],
            },
        ]);
        const provider = new WorktreeDataProvider(context);
        const original = (await provider.getChildren())!;
        expect(original.map((item: any) => item.name)).toEqual(['Group', 'main', 'loose']);
        expect((original[0] as any).children.map((item: any) => item.name)).toEqual(['feature-10', 'feature-2']);

        sortOrder = 'nameAsc';
        const ascending = (await provider.getChildren())!;
        expect(ascending.map((item: any) => item.name)).toEqual(['Group', 'loose', 'main']);
        expect((ascending[0] as any).children.map((item: any) => item.name)).toEqual(['feature-2', 'feature-10']);

        sortOrder = 'nameDesc';
        const descending = (await provider.getChildren())!;
        expect(descending.map((item: any) => item.name)).toEqual(['Group', 'main', 'loose']);
        expect((descending[0] as any).children.map((item: any) => item.name)).toEqual(['feature-10', 'feature-2']);
    });

    it('renders a nested repository group after workspace repositories', async () => {
        nestedRepos = ['/repo/nested'];
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;

        expect(roots.map((item: any) => item.type)).toEqual([
            TreeItemKind.workspaceGitMainFolder,
            TreeItemKind.nestedRepoGroup,
        ]);
        const group = roots[1] as any;
        const groupChildren = (await provider.getChildren(group))!;
        expect(groupChildren.map((item: any) => item.fsPath)).toEqual(['/repo/nested']);
        expect(provider.getParent(groupChildren[0])).toBe(group);
    });

    it('loads worktrees for a nested repository from its own path', async () => {
        nestedRepos = ['/repo/nested'];
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;
        const group = roots.find((item: any) => item.type === TreeItemKind.nestedRepoGroup) as any;
        const groupChildren = (await provider.getChildren(group))!;
        const nested = groupChildren[0];
        const children = (await provider.getChildren(nested))!;

        expect(children.length).toBeGreaterThan(0);
        expect(worktreeListModule.getWorktreeList).toHaveBeenCalledWith('/repo/nested');
    });

    it('marks all displayed nested repos as nested and valid', async () => {
        nestedRepos = ['/repo/selected'];
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;
        const group = roots.find((item: any) => item.type === TreeItemKind.nestedRepoGroup) as any;
        const groupChildren = (await provider.getChildren(group))!;

        expect(groupChildren.map((item: any) => item.fsPath)).toEqual(['/repo/selected']);
        expect((groupChildren[0] as any).options).toMatchObject({ nested: true, invalid: false });
    });

    it('sorts nested repos by name and de-duplicates registered paths', async () => {
        nestedRepos = ['/repo/zeta', '/repo/alpha', '/repo/alpha/'];
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;
        const group = roots.find((item: any) => item.type === TreeItemKind.nestedRepoGroup) as any;
        const groupChildren = (await provider.getChildren(group))!;

        expect(groupChildren.map((item: any) => item.fsPath)).toEqual(['/repo/alpha', '/repo/zeta']);
    });

    it('marks nested-repo worktrees that live under a workspace folder', async () => {
        nestedRepos = ['/repo/nested'];
        rs.mocked(worktreeListModule.getWorktreeList).mockResolvedValue([
            { path: '/repo/nested', name: 'main', mainFolder: '/repo/nested' },
            { path: '/repo/nested.worktrees/feature', name: 'feature', mainFolder: '/repo/nested' },
            { path: '/outside/wt', name: 'outside', mainFolder: '/repo/nested' },
        ] as any);
        rs.mocked(groupModule.getRepositoryWorktreeGroups).mockReturnValue([]);
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;
        const group = roots.find((item: any) => item.type === TreeItemKind.nestedRepoGroup) as any;
        const nested = (await provider.getChildren(group))![0];
        const worktrees = (await provider.getChildren(nested))!;

        expect(worktrees.map((item: any) => [item.fsPath, item.inWorkspace])).toEqual([
            ['/repo/nested', true],
            ['/repo/nested.worktrees/feature', true],
            ['/outside/wt', false],
        ]);
    });

    it('does not mark workspace-repository worktrees as in-workspace', async () => {
        mainFolders = [
            { name: 'repo', path: '/repo' },
            { name: 'other', path: '/other' },
        ];
        (folderRoot as any).folderPathSet = new Set(['/repo', '/other']);
        const provider = new WorktreeDataProvider(context);
        const repositories = (await provider.getChildren())!;
        const children = (await provider.getChildren(repositories[0]))!;
        const worktrees = children.filter((item: any) => item.type === TreeItemKind.worktree);

        expect(worktrees.length).toBeGreaterThan(0);
        expect(worktrees.every((item: any) => item.inWorkspace === false)).toBe(true);
    });

    it('skips nested repository paths that are already shown as workspace repositories', async () => {
        mainFolders = [
            { name: 'repo', path: '/repo' },
            { name: 'other', path: '/other' },
        ];
        (folderRoot as any).folderPathSet = new Set(['/repo', '/other']);
        nestedRepos = ['/repo'];
        const provider = new WorktreeDataProvider(context);
        const roots = (await provider.getChildren())!;

        expect(roots.map((item: any) => item.type)).toEqual([
            TreeItemKind.workspaceGitMainFolder,
            TreeItemKind.workspaceGitMainFolder,
        ]);
    });
});
