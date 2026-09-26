import { randomUUID } from 'crypto';
import { GlobalState } from '@/core/state';
import { comparePath, toSimplePath } from '@/core/util/path';
import { IWorktreeGroup } from '@/types';

export const getWorktreeGroups = (): IWorktreeGroup[] => GlobalState.get('worktreeGroups', []);

export const getRepositoryWorktreeGroups = (repositoryPath: string): IWorktreeGroup[] => {
    return getWorktreeGroups().filter((group) => comparePath(group.repositoryPath, repositoryPath));
};

export const hasWorktreeGroupName = (repositoryPath: string, name: string, exceptId?: string): boolean => {
    const normalizedName = name.trim().toLocaleLowerCase();
    return getRepositoryWorktreeGroups(repositoryPath).some(
        (group) => group.id !== exceptId && group.name.toLocaleLowerCase() === normalizedName,
    );
};

const updateWorktreeGroups = (groups: IWorktreeGroup[]) => GlobalState.update('worktreeGroups', groups);

export const createWorktreeGroup = async (
    repositoryPath: string,
    name: string,
): Promise<IWorktreeGroup | undefined> => {
    const normalizedName = name.trim();
    if (!normalizedName || hasWorktreeGroupName(repositoryPath, normalizedName)) return;

    const group: IWorktreeGroup = {
        id: randomUUID(),
        name: normalizedName,
        repositoryPath: toSimplePath(repositoryPath),
        worktreePaths: [],
    };
    await updateWorktreeGroups([...getWorktreeGroups(), group]);
    return group;
};

export const renameWorktreeGroup = async (groupId: string, name: string): Promise<boolean> => {
    const groups = getWorktreeGroups();
    const group = groups.find((item) => item.id === groupId);
    const normalizedName = name.trim();
    if (!group || !normalizedName || hasWorktreeGroupName(group.repositoryPath, normalizedName, groupId)) return false;

    await updateWorktreeGroups(groups.map((item) => (item.id === groupId ? { ...item, name: normalizedName } : item)));
    return true;
};

export const deleteWorktreeGroup = async (groupId: string): Promise<void> => {
    await updateWorktreeGroups(getWorktreeGroups().filter((group) => group.id !== groupId));
};

export const assignWorktreeToGroup = async (
    repositoryPath: string,
    worktreePath: string,
    groupId?: string,
): Promise<boolean> => {
    const groups = getWorktreeGroups();
    const target = groupId ? groups.find((group) => group.id === groupId) : undefined;
    if (groupId && (!target || !comparePath(target.repositoryPath, repositoryPath))) return false;

    const normalizedWorktreePath = toSimplePath(worktreePath);
    const nextGroups = groups.map((group) => {
        if (!comparePath(group.repositoryPath, repositoryPath)) return group;
        const withoutWorktree = group.worktreePaths.filter((item) => !comparePath(item, normalizedWorktreePath));
        if (group.id !== groupId) return { ...group, worktreePaths: withoutWorktree };
        return { ...group, worktreePaths: [...withoutWorktree, normalizedWorktreePath] };
    });
    await updateWorktreeGroups(nextGroups);
    return true;
};

export const removeWorktreeGroupAssignment = async (worktreePath: string): Promise<void> => {
    const groups = getWorktreeGroups();
    const nextGroups = groups.map((group) => ({
        ...group,
        worktreePaths: group.worktreePaths.filter((item) => !comparePath(item, worktreePath)),
    }));
    await updateWorktreeGroups(nextGroups);
};

export const replaceGroupedWorktreePath = async (oldPath: string, newPath: string): Promise<void> => {
    const groups = getWorktreeGroups();
    const normalizedNewPath = toSimplePath(newPath);
    const nextGroups = groups.map((group) => ({
        ...group,
        worktreePaths: group.worktreePaths.map((item) => (comparePath(item, oldPath) ? normalizedNewPath : item)),
    }));
    await updateWorktreeGroups(nextGroups);
};
