import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getNameRev } from '@/core/git/getNameRev';
import { getMainFolder } from '@/core/git/getMainFolder';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import logger from '@/core/log/logger';
import path from 'path';

function parseWorktreeOutput(output: string): IWorktreeOutputItem[] {
    return output
        .split('\n')
        .reduce<string[][]>(
            (list, textLine) => {
                if (textLine) {
                    list[list.length - 1].push(textLine);
                } else {
                    list.push([]);
                }
                return list;
            },
            [[]],
        )
        .filter((lines) => lines.length)
        .map((lines) => {
            const entries = lines.map((text) => {
                const [key, ...values] = text.split(' ');
                return [key, values.join(' ')] as [string, string];
            });
            return Object.fromEntries(entries) as unknown as IWorktreeOutputItem;
        });
}

function checkIsTag(nameRev: string) {
    return Boolean(
        nameRev &&
        /^tags\/[^~]+/.test(nameRev) &&
        // 排除 tags/xxx-<数字>-g<哈希>
        !/^tags\/.+-\d+-g[0-9a-f]{7}$/.test(nameRev),
    );
}

async function buildWorktreeDetail(item: IWorktreeOutputItem, mainFolder: string, cwd: string): Promise<IWorktreeDetail> {
    const branchName = item.branch?.replace('refs/heads/', '') || '';

    // Resolve relative paths (e.g., ../repo.worktrees/branch) to absolute
    const worktreePath = path.isAbsolute(item.worktree)
        ? item.worktree
        : path.resolve(cwd, item.worktree);

    let nameRev = '';
    if (!branchName) nameRev = (await getNameRev(worktreePath)).trim();

    const isTag = checkIsTag(nameRev);
    const isBare = Reflect.has(item, 'bare');
    const locked = Reflect.has(item, 'locked');
    const isMain = worktreePath.trim() === mainFolder;
    const isBranch = Boolean(branchName);
    const detached = Reflect.has(item, 'detached');
    const prunable = Reflect.has(item, 'prunable');

    let name = '';
    if (isBare) {
        name = '<BARE>';
    } else if (branchName) {
        name = branchName;
    } else if (nameRev) {
        name = isTag ? nameRev.replace(/^tags\//, '').trim() : item.HEAD?.slice(0, 8);
    }

    const hash = item.HEAD || '';

    return {
        name,
        path: worktreePath,
        isBare,
        isBranch,
        isTag,
        detached,
        prunable,
        locked,
        isMain,
        hash,
        mainFolder,
    };
}

export async function getWorktreeList(root?: string): Promise<IWorktreeDetail[]> {
    const cwd = root || folderRoot.uri?.fsPath || '';

    try {
        const [{ stdout: output }, mainFolder] = await Promise.all([
            execBase(cwd, ['worktree', 'list', '--porcelain']),
            getMainFolder(cwd),
        ]);

        const worktreeList = parseWorktreeOutput(output);

        return await Promise.all(worktreeList.map((item) => buildWorktreeDetail(item, mainFolder)));
    } catch (error) {
        logger.error(error);
        return [];
    }
}
