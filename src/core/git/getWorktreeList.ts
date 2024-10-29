import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getAllRefList } from '@/core/git/getAllRefList';
import { getNameRev } from '@/core/git/getNameRev';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import { getAheadBehindCommitCount } from '@/core/git/getAheadBehindCommitCount';
import logger from '@/core/log/logger';

export async function getWorktreeList(root?: string, skipRemote?: boolean): Promise<IWorktreeDetail[]> {
    let cwd = root || folderRoot.uri?.fsPath || '';
    try {
        const [output, mainFolderFull, remoteBranchOutput, branchList] = await Promise.all([
            execBase(cwd, ['worktree', 'list', '--porcelain']),
            execBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
            skipRemote ? Promise.resolve('') : execBase(cwd, ['remote']),
            skipRemote
                ? Promise.resolve([])
                : getAllRefList(['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'], cwd),
        ]);

        const mainFolder = mainFolderFull.replace('/.git', '').trim();
        const [remoteName] = remoteBranchOutput.split('\n');
        const remoteBranchMap = new Map(
            branchList.filter((item) => item['upstream:remoteref']).map((item) => [item.refname, item]),
        );
        let list = output
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
                return new Map<string, string | void>(itemList);
            })
            .map((mapItem) => Object.fromEntries(mapItem));
        let detailList = await Promise.all(
            (list as unknown as IWorktreeOutputItem[]).map(async (item) => {
                const branchName = item.branch?.replace('refs/heads/', '') || '';
                const remoteTrackItem = item.branch ? remoteBranchMap.get(item.branch) : void 0;
                const remoteRef = remoteTrackItem?.['upstream:remoteref'].replace('refs/heads/', '');
                const remote = remoteTrackItem?.['upstream:remotename'];
                const remoteBranchName = `${remote}/${remoteRef}`;
                const hasRemote = item.branch ? remoteBranchMap.has(item.branch) : false;
                const [aheadBehind, nameRev] = await Promise.all([
                    !skipRemote && branchName && remoteName && hasRemote
                        ? getAheadBehindCommitCount(
                              item.branch || '',
                              `refs/remotes/${remoteBranchName}`,
                              item.worktree,
                          )
                        : Promise.resolve(void 0),
                    !branchName ? getNameRev(item.worktree) : Promise.resolve(''),
                ]);
                const isRemoteRev = /^remotes\//.test(nameRev);
                const isTag = /^tags\/[^~]+/.test(nameRev);
                let name = branchName;
                if (!name) {
                    name =
                        isRemoteRev || /^heads\//.test(nameRev)
                            ? item.HEAD?.slice(0, 8)
                            : nameRev
                                  .replace(/^tags\//, '')
                                  .replace(/^heads\//, '')
                                  .trim();
                }
                return {
                    name,
                    path: item.worktree,
                    isBranch: !!branchName,
                    isTag,
                    detached: Reflect.has(item, 'detached'),
                    prunable: !!item.prunable,
                    locked: Reflect.has(item, 'locked'),
                    isMain: item.worktree.trim() === mainFolder,
                    ahead: aheadBehind?.ahead,
                    behind: aheadBehind?.behind,
                    hash: item.HEAD,
                    remoteRef,
                    remote,
                    mainFolder,
                };
            }),
        );
        return detailList;
    } catch (error) {
        logger.error(error);
        return [];
    }
}