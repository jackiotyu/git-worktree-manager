import { execAuto } from '@/core/git/exec';
import { WORK_TREE } from '@/constants';
import { getMainFolder } from '@/core/git/getMainFolder';
import folderRoot from '@/core/folderRoot';

import * as path from 'path';
import * as fs from 'fs/promises';

interface WorktreeInfo {
    name: string;
    metaPath: string;
    realPath: string | null;
}

function parsePruneDryRunOutput(output: string): string[] {
    // eg: "Removing worktrees/terst2: gitdir file points to non-existent location"
    const regex = /Removing worktrees\/([^\s:]+):/g;
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(output)) !== null) {
        names.push(match[1]);
    }
    return names;
}

async function getRealWorktreePath(repoPath: string, gitDir: string, worktreeName: string): Promise<string | null> {
    const metaPath = path.resolve(repoPath, gitDir, 'worktrees', worktreeName);
    const gitdirFile = path.join(metaPath, 'gitdir');
    try {
        const gitdirContent = await fs.readFile(gitdirFile, 'utf-8');
        const realGitDir = gitdirContent.trim();
        const realPath = path.resolve(realGitDir, '..');
        return realPath;
    } catch {
        return null;
    }
}

export async function analyzePruneDryRun(
    repoPath: string,
    pruneDryRunOutput: string,
    gitDirRaw: string,
): Promise<WorktreeInfo[]> {
    const gitDir = gitDirRaw.trim();
    const worktreeNames = parsePruneDryRunOutput(pruneDryRunOutput);

    const results: WorktreeInfo[] = [];
    for (const name of worktreeNames) {
        const metaPath = path.resolve(repoPath, gitDir, 'worktrees', name);
        const realPath = await getRealWorktreePath(repoPath, gitDir, name);
        results.push({ name, metaPath, realPath });
    }

    return results;
}

export async function pruneWorktree(dryRun: boolean = false, cwd?: string) {
    try {
        const res = await execAuto(
            cwd,
            [WORK_TREE, 'prune', dryRun ? '--dry-run' : '', '-v'].filter((i) => i),
        );
        const repoPath = await getMainFolder(cwd || folderRoot.uri?.fsPath || '');
        const gitDirRaw = await execAuto(cwd, ['rev-parse', '--git-dir']);
        const worktreeList = await analyzePruneDryRun(repoPath, res.stdout + res.stderr, gitDirRaw.stdout);
        return worktreeList.map((worktree) => worktree.realPath);
    } catch (error: any) {
        return [];
    }
}
