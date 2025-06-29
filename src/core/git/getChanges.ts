import { execBase } from '@/core/git/exec';

export interface IChanges {
    /** staged area */
    x: string;
    /** working directory */
    y: string;
    fsPath: string;
    raw: string;
}

export const getChanges = async (cwd: string): Promise<IChanges[]> => {
    const { stdout } = await execBase(cwd, ['status', '--short']).catch(() => ({ stdout: '' }));
    if (!stdout) return [];
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map<IChanges>((line: string) => {
        // 前两个字符是状态码，第3个开始是路径（注意可能有多个空格）
        const x = line[0];
        const y = line[1];
        const path = line.slice(3).trim(); // 文件路径，去除前导空格
        return { x, y, fsPath: path, raw: line };
    });
};
