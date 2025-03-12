import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getNameRev } from '@/core/git/getNameRev';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import logger from '@/core/log/logger';

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
            [[]]
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

async function buildWorktreeDetail(item: IWorktreeOutputItem, mainFolder: string): Promise<IWorktreeDetail> {
    const branchName = item.branch?.replace('refs/heads/', '') || '';

    let nameRev = '';
    if (!branchName) nameRev = await getNameRev(item.worktree);

    const isTag = /^tags\/[^~]+/.test(nameRev);
    const isBare = Reflect.has(item, 'bare');
    const locked = Reflect.has(item, 'locked');
    const isMain = item.worktree.trim() === mainFolder;
    const isBranch = Boolean(branchName);
    const detached = Reflect.has(item, 'detached');
    const prunable = Reflect.has(item, 'prunable');

    let name = '';
    if (isBare) {
        name = '<BARE>';
    } else if (branchName) {
        name = branchName;
    } else if (nameRev) {
        name = /^heads\//.test(nameRev)
            ? item.HEAD?.slice(0, 8)
            : nameRev
                  .replace(/^tags\//, '')
                  .replace(/^heads\//, '')
                  .trim();
    }

    const hash = item.HEAD || '';

    return {
        name,
        path: item.worktree,
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
        const [output, mainFolderFull] = await Promise.all([
            execBase(cwd, ['worktree', 'list', '--porcelain']),
            execBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
        ]);

        const mainFolder = mainFolderFull.replace('/.git', '').trim();
        const worktreeList = parseWorktreeOutput(output);

        return await Promise.all(worktreeList.map((item) => buildWorktreeDetail(item, mainFolder)));
    } catch (error) {
        logger.error(error);
        return [];
    }
}
