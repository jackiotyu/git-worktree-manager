import { execBase } from '@/core/git/exec';

// Fork from https://github.com/gitkraken/vscode-gitlens/blob/2fd2bbbe328fbe66f879b78a61cab6df65181452/src/env/node/git/git.ts#L1660
export async function getAheadBehindCommitCount(ref1: string, ref2: string, cwd: string) {
    try {
        let { stdout: data } = await execBase(cwd, ['rev-list', '--left-right', '--count', `${ref1}...${ref2}`, '--']);
        if (data.length === 0) return undefined;
        const parts = data.split('\t');
        if (parts.length !== 2) return undefined;
        const [ahead, behind] = parts;
        const result = {
            ahead: parseInt(ahead, 10),
            behind: parseInt(behind, 10),
        };
        if (isNaN(result.ahead) || isNaN(result.behind)) return undefined;
        return result;
    } catch {
        return void 0;
    }
}
