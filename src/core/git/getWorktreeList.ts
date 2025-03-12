import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getAllRefList } from '@/core/git/getAllRefList';
import { getNameRev } from '@/core/git/getNameRev';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import { getAheadBehindCommitCount } from '@/core/git/getAheadBehindCommitCount';
import logger from '@/core/log/logger';

interface GitRefInfo {
    remoteName: string;
    remoteBranchMap: Map<string, Record<string, string>>;
}

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
        .filter(lines => lines.length)
        .map(lines => {
            const entries = lines.map(text => {
                const [key, ...values] = text.split(' ');
                return [key, values.join(' ')] as [string, string];
            });
            return Object.fromEntries(entries) as unknown as IWorktreeOutputItem;
        });
}

async function getGitRefInfo(cwd: string, skipRemote: boolean): Promise<GitRefInfo> {
    if (skipRemote) {
        return {
            remoteName: '',
            remoteBranchMap: new Map()
        };
    }

    const [remoteBranchOutput, branchList] = await Promise.all([
        execBase(cwd, ['remote']),
        getAllRefList(['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'], cwd)
    ]);

    const [remoteName] = remoteBranchOutput.split('\n');
    const remoteBranchMap = new Map(
        branchList
            .filter(item => item['upstream:remoteref'])
            .map(item => [item.refname, item])
    );

    return { remoteName, remoteBranchMap };
}

async function buildWorktreeDetail(
    item: IWorktreeOutputItem,
    mainFolder: string,
    { remoteName, remoteBranchMap }: GitRefInfo,
    skipRemote: boolean
): Promise<IWorktreeDetail> {
    const branchName = item.branch?.replace('refs/heads/', '') || '';
    const remoteTrackItem = item.branch ? remoteBranchMap.get(item.branch) : undefined;
    const remoteRef = remoteTrackItem?.['upstream:remoteref']?.replace('refs/heads/', '');
    const remote = remoteTrackItem?.['upstream:remotename'];
    const remoteBranchName = remote && remoteRef ? `${remote}/${remoteRef}` : '';
    const hasRemote = Boolean(item.branch && remoteBranchMap.has(item.branch));

    const [aheadBehind, nameRev] = await Promise.all([
        !skipRemote && branchName && remoteName && hasRemote
            ? getAheadBehindCommitCount(
                item.branch || '',
                `refs/remotes/${remoteBranchName}`,
                item.worktree
            )
            : Promise.resolve(undefined),
        !branchName ? getNameRev(item.worktree) : Promise.resolve('')
    ]);

    const isTag = /^tags\/[^~]+/.test(nameRev);
    const isBare = Reflect.has(item, 'bare');
    const locked = Reflect.has(item, 'locked');
    const isMain = item.worktree.trim() === mainFolder;
    const isBranch = Boolean(branchName);
    const detached = Reflect.has(item, 'detached');
    const prunable = Reflect.has(item, 'prunable');
    
    let name = '';
    if(isBare) {
        name = '<BARE>';
    } else if (branchName) {
        name = branchName;
    } else if (nameRev) {
        name = /^heads\//.test(nameRev)
            ? item.HEAD?.slice(0, 8)
            : nameRev.replace(/^tags\//, '').replace(/^heads\//, '').trim();
    }

    const hash = item.HEAD || '';

    const ahead = aheadBehind?.ahead;
    const behind = aheadBehind?.behind;

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
        ahead,
        behind,
        hash,
        remoteRef,
        remote,
        mainFolder
    };
}

export async function getWorktreeList(root?: string, skipRemote?: boolean): Promise<IWorktreeDetail[]> {
    const cwd = root || folderRoot.uri?.fsPath || '';
    
    try {
        const [output, mainFolderFull] = await Promise.all([
            execBase(cwd, ['worktree', 'list', '--porcelain']),
            execBase(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
        ]);

        const mainFolder = mainFolderFull.replace('/.git', '').trim();
        const gitRefInfo = await getGitRefInfo(cwd, Boolean(skipRemote));
        const worktreeList = parseWorktreeOutput(output);

        return await Promise.all(
            worktreeList.map(item => 
                buildWorktreeDetail(item, mainFolder, gitRefInfo, Boolean(skipRemote))
            )
        );
    } catch (error) {
        logger.error(error);
        return [];
    }
}