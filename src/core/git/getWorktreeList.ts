import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getAllRefList } from '@/core/git/getAllRefList';
import { getNameRev } from '@/core/git/getNameRev';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import { getAheadBehindCommitCount } from '@/core/git/getAheadBehindCommitCount';
import logger from '@/core/log/logger';

const refParams = ['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'] as const;

async function fetchWorktreeData(cwd: string, skipRemote?: boolean) {
    const promises = [
        execBase(cwd, ['worktree', 'list', '--porcelain']),
        execBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
        skipRemote ? Promise.resolve('') : execBase(cwd, ['remote']),
        skipRemote ? Promise.resolve([]) : getAllRefList([...refParams], cwd),
    ] as const;
    return await Promise.all(promises);
}

function parseWorktreeOutput(output: string): IWorktreeOutputItem[] {
    return output
    .split('\n')
    .reduce<string[][]>(
        (list, textLine) => {
            if (textLine) list[list.length - 1].push(textLine);
            else list.push([]);
            return list;
        },
        [[]],
    )
    .filter((i) => i.length)
    .map((item) => {
        let itemList = item.map<[string, string]>((text) => {
            let split = text.split(' ');
            return [split[0], split.slice(1).join(' ')];
        });
        return Object.fromEntries(itemList);
    }) as unknown as IWorktreeOutputItem[];
}

interface ICreateWorktreeDetailParams {
    item: IWorktreeOutputItem;
    branchName?: string;
    nameRev?: string;
    remoteBranchMap: Map<string, Record<typeof refParams[number], string>>;
    mainFolder: string;
    aheadBehind?: { ahead?: number; behind?: number };
}

function createWorktreeDetail({
    item,
    branchName,
    nameRev,
    remoteBranchMap,
    mainFolder,
    aheadBehind,
}: ICreateWorktreeDetailParams): IWorktreeDetail {
    const isRemoteRev = /^remotes\//.test(nameRev || '');
    const isTag = /^tags\/[^~]+/.test(nameRev || '');
    let name = branchName || (isRemoteRev ? item.HEAD?.slice(0, 8) : nameRev?.replace(/^tags\//, '').replace(/^heads\//, '').trim());

    return {
        name: name || '',
        path: item.worktree,
        hash: item.HEAD || '',
        detached: Reflect.has(item, 'detached'),
        prunable: !!item.prunable,
        isBranch: !!branchName,
        isTag,
        locked: Reflect.has(item, 'locked'),
        isMain: item.worktree.trim() === mainFolder.trim(),
        ahead: aheadBehind?.ahead,
        behind: aheadBehind?.behind,
        remoteRef: branchName ? remoteBranchMap.get(branchName)?.['upstream:remoteref']?.replace('refs/heads/', '') : void 0,
        remote: branchName ? remoteBranchMap.get(branchName)?.['upstream:remotename'] : void 0,
    };
}

export async function getWorktreeList(root?: string, skipRemote?: boolean): Promise<IWorktreeDetail[]> {
    let cwd = root || folderRoot.uri?.fsPath || '';
    try {
        const [output, mainFolderFull, remoteBranchOutput, branchList] = await fetchWorktreeData(cwd, skipRemote);

        const mainFolder = mainFolderFull.replace('/.git', '');
        const [remoteName] = remoteBranchOutput.split('\n');
        const remoteBranchMap = new Map(
            branchList.filter((item) => item['upstream:remoteref']).map((item) => [item.refname, item]),
        );
        let list = parseWorktreeOutput(output);
        let detailList = await Promise.all(
            list.map(async (item) => {
                const branchName = item.branch?.replace('refs/heads/', '') || '';
                const nameRev = !branchName ? await getNameRev(item.worktree) : '';
                const aheadBehind = !skipRemote && branchName
                    ? await getAheadBehindCommitCount(item.branch || '', `refs/remotes/${remoteName}/${branchName}`, item.worktree)
                    : undefined;

                return createWorktreeDetail({
                    item,
                    branchName,
                    nameRev,
                    remoteBranchMap,
                    mainFolder,
                    aheadBehind,
                });
            }),
        );
        return detailList;
    } catch (error) {
        logger.error(error);
        return [];
    }
}