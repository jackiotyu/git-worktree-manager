import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';
import { getWorktreeList } from '@/core/git/getWorktreeList';
import { IWorktreeLess } from '@/types';

export interface IMergedWorktreeCandidate extends IWorktreeLess {
    branch: string;
    isMerged: boolean;
    isMain: boolean;
}

function parseMergedBranchNames(output: string): Set<string> {
    return new Set(
        output
            .split('\n')
            .filter((line) => /^\+/.test(line))
            .map((line) => line.replace('+', '').trim()),
    );
}

export async function getMergedWorktreeCandidates(repoPath: string): Promise<IMergedWorktreeCandidate[]> {
    const mergedNames = new Set<string>();

    try {
        const { stdout } = await execAuto(repoPath, ['branch', '--merged']);
        parseMergedBranchNames(stdout).forEach((branchName) => mergedNames.add(branchName));
    } catch {
        // If git branch --merged fails, keep mergedNames empty and allow user review.
    }

    const worktreeList = await getWorktreeList(repoPath, false, false);
    return worktreeList.map((item) => {
        const branchName = item.isBranch ? item.name : '';
        const isMerged = Boolean(branchName && mergedNames.has(branchName));
        return {
            name: item.name,
            fsPath: item.path,
            uriPath: vscode.Uri.file(item.path).toString(),
            branch: branchName,
            isMerged,
            isMain: item.isMain,
        };
    });
}
