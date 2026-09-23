import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';
import { getNameRev } from '@/core/git/getNameRev';
import { getMainFolder } from '@/core/git/getMainFolder';
import { comparePath, toSimplePath } from '@/core/util/path';
import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
import logger from '@/core/log/logger';
import { parseUpstream } from '@/core/util/ref';
import { Config } from '@/core/config/setting';

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

interface BranchTrackInfo {
    upstream: string;
    remote?: string;
    remoteRef?: string;
    ahead?: number;
    behind?: number;
}

async function getBranchTrackInfoMap(cwd: string, branchRefs: string[]): Promise<Map<string, BranchTrackInfo>> {
    const validRefs = [...new Set(branchRefs.filter(Boolean))];
    const map = new Map<string, BranchTrackInfo>();
    if (validRefs.length === 0) return map;
    try {
        const { stdout } = await execBase(cwd, [
            'for-each-ref',
            '--format=%(refname)%00%(upstream)%00%(upstream:track,nobracket)',
            ...validRefs,
        ]);
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (!line) continue;
            const [branch, upstreamRef, track] = line.split('\0');
            if (!branch) continue;
            const upstream = upstreamRef?.replace(/^refs\/(?:remotes|heads)\//, '') || '';
            let ahead: number | undefined;
            let behind: number | undefined;
            if (track) {
                const aheadMatch = track.match(/ahead (\d+)/);
                const behindMatch = track.match(/behind (\d+)/);
                if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
                if (behindMatch) behind = parseInt(behindMatch[1], 10);
            }
            const { branch: remoteRef, remote } = upstream ? parseUpstream(upstream) : { branch: '', remote: '' };
            map.set(branch, {
                upstream,
                remote: remote || undefined,
                remoteRef: remoteRef || undefined,
                ahead,
                behind,
            });
        }
    } catch (e) {
        logger.error(`Failed to get branch track info: ${e}`);
    }
    return map;
}

const commitDateFormat = '--pretty=format:%H %cI';

function collectCommitHashes(worktreeList: IWorktreeOutputItem[]): string[] {
    return worktreeList
        .filter((item) => !Reflect.has(item, 'bare') && !Reflect.has(item, 'prunable'))
        .map((item) => item.HEAD || '');
}

function readCommitDates(stdout: string, dateMap: Map<string, string>) {
    for (const line of stdout.split('\n')) {
        const [hash, date] = line.trim().split(' ');
        if (hash && date) dateMap.set(hash, date);
    }
}

async function getCommitDates(cwd: string, hashes: string[]): Promise<Map<string, string>> {
    const validHashes = [...new Set(hashes.filter(Boolean))];
    const dateMap = new Map<string, string>();
    if (validHashes.length === 0) return dateMap;
    try {
        const { stdout } = await execBase(cwd, ['log', '--no-walk', commitDateFormat, ...validHashes]);
        readCommitDates(stdout, dateMap);
        return dateMap;
    } catch (e) {
        logger.error(`Failed to get commit dates: ${e}`);
    }

    // 单个无效对象会使整批 git log 失败，逐个查询以保留其余工作树的日期
    await Promise.all(
        validHashes.map(async (hash) => {
            try {
                const { stdout } = await execBase(cwd, ['log', '--no-walk', commitDateFormat, hash]);
                readCommitDates(stdout, dateMap);
            } catch (error) {
                logger.error(`Failed to get commit date for ${hash}: ${error}`);
            }
        }),
    );
    return dateMap;
}

async function buildWorktreeDetail(
    item: IWorktreeOutputItem,
    mainFolder: string,
    commitDates: Map<string, string>,
    branchTrackMap: Map<string, BranchTrackInfo>,
): Promise<IWorktreeDetail> {
    const branchName = item.branch?.replace('refs/heads/', '') || '';

    let nameRev = '';
    if (!branchName) nameRev = (await getNameRev(item.worktree)).trim();

    const worktreePath = toSimplePath(item.worktree);
    const mainFolderPath = toSimplePath(mainFolder);
    const isTag = checkIsTag(nameRev);
    const isBare = Reflect.has(item, 'bare');
    const locked = Reflect.has(item, 'locked');
    const isMain = comparePath(worktreePath, mainFolderPath);
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
    const lastCommitDate = !isBare && !prunable && hash ? commitDates.get(hash) : undefined;
    const branchInfo = item.branch ? branchTrackMap.get(item.branch) : undefined;

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
        mainFolder: mainFolderPath,
        lastCommitDate,
        upstream: branchInfo?.upstream,
        remote: branchInfo?.remote,
        remoteRef: branchInfo?.remoteRef,
        ahead: branchInfo?.ahead,
        behind: branchInfo?.behind,
    };
}

export async function getWorktreeList(
    root?: string,
    needLastCommitDate: boolean = true,
    needUpstreamInfo: boolean = true,
): Promise<IWorktreeDetail[]> {
    const cwd = root || folderRoot.uri?.fsPath || '';

    try {
        const needCommitDate = needLastCommitDate ?? true;
        const needFetch = needUpstreamInfo && Config.get('treeView.showFetchInTreeItem', true);

        const [{ stdout: output }, mainFolder] = await Promise.all([
            execBase(cwd, ['worktree', 'list', '--porcelain']),
            getMainFolder(cwd),
        ]);

        const worktreeList = parseWorktreeOutput(output);
        const branchRefs = [...new Set(worktreeList.map((item) => item.branch).filter((ref): ref is string => !!ref))];

        const [commitDates, branchTrackMap] = await Promise.all([
            needCommitDate
                ? getCommitDates(cwd, collectCommitHashes(worktreeList))
                : Promise.resolve(new Map<string, string>()),
            needFetch && branchRefs.length > 0
                ? getBranchTrackInfoMap(cwd, branchRefs)
                : Promise.resolve(new Map<string, BranchTrackInfo>()),
        ]);

        return await Promise.all(
            worktreeList.map((item) => buildWorktreeDetail(item, mainFolder, commitDates, branchTrackMap)),
        );
    } catch (error) {
        logger.error(error);
        return [];
    }
}
