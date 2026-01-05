import { execAuto } from '@/core/git/exec';
import { formatSimpleQuery, parseOutput } from '@/core/util/parse';

export const getLashCommitDetail = async <T extends string>(
    cwd: string,
    keys: T[],
): Promise<Record<T, string | void>> => {
    try {
        const { stdout: output } = await execAuto(cwd, ['log', '-1', `--pretty=format:${formatSimpleQuery(keys)}`]);
        return parseOutput(output, keys)[0];
    } catch {
        return {} as Record<T, void>;
    }
};
