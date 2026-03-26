import path from 'path';
import { execBase } from '@/core/git/exec-base';
import { toSimplePath } from '@/core/util/path';

export const getMainFolder = async (cwd: string) => {
    try {
        const { stdout: mainFolderFull } = await execBase(cwd, ['rev-parse', '--git-common-dir']);
        const trimmed = mainFolderFull.trim();
        if (!trimmed) return '';
        const absPath = toSimplePath(path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed));
        return path.basename(absPath) === '.git' ? path.dirname(absPath) : absPath;
    } catch {
        return '';
    }
};
