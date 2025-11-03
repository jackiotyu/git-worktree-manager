import { execBase } from '@/core/git/exec-base';

export const getMainFolder = async (cwd: string) => {
    try {
        const { stdout: mainFolderFull } = await execBase(cwd, [
            'rev-parse',
            '--path-format=absolute',
            '--git-common-dir',
        ]);
        return mainFolderFull.trim().replace(/\/.git$/, '');
    } catch {
        return '';
    }
};
