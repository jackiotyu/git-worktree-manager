import { execBase } from '@/core/git/exec-base';

export const getMainFolder = async (cwd: string) => {
    try {
        const { stdout: mainFolderFull } = await execBase(cwd, ['rev-parse', '--git-common-dir']);
        if (mainFolderFull.trim() === '.git') return cwd;
        return mainFolderFull.trim().replace(/\/.git$/, '');
    } catch {
        return '';
    }
};
