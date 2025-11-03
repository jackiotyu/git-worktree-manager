import { execAuto } from '@/core/git/exec';
import { formatQuery, parseOutput } from '@/core/util/parse';

export async function getAllRefList<T extends string>(keys: T[], cwd?: string, args?: string[]) {
    try {
        let { stdout: output } = await execAuto(cwd, [
            'for-each-ref',
            `--format=${formatQuery(keys)}`,
            '--sort=-refname:lstrip=2',
            '--sort=-committerdate',
            ...(args || []),
        ]);
        return parseOutput(output, keys);
    } catch {
        return [];
    }
}
