import fs from 'fs/promises';
import path from 'path';
import { execAuto } from '@/core/git/exec';
import { toSimplePath } from '@/core/util/path';

const markerFileName = 'git-worktree-manager-multi-repository.json';

export async function getRegisteredWorktreePaths(repoPath: string): Promise<Set<string>> {
    const { stdout } = await execAuto(repoPath, ['worktree', 'list', '--porcelain']);
    const paths = [...stdout.matchAll(/^worktree (.+)$/gm)].map((match) =>
        normalizeRepositoryPath(match[1].replace(/\r$/, '')),
    );
    return new Set(paths);
}

export async function isRegisteredWorktree(repoPath: string, targetPath: string): Promise<boolean> {
    const paths = await getRegisteredWorktreePaths(repoPath);
    return paths.has(normalizeRepositoryPath(targetPath));
}

async function getMarkerPath(worktreePath: string): Promise<string> {
    const gitEntry = path.join(worktreePath, '.git');
    const entryStat = await fs.stat(gitEntry);
    let gitDir: string;

    if (entryStat.isDirectory()) {
        gitDir = gitEntry;
    } else if (entryStat.isFile()) {
        const content = await fs.readFile(gitEntry, 'utf8');
        const match = /^gitdir:\s*(.+)\s*$/im.exec(content);
        if (!match) throw new Error(`Invalid .git file: ${gitEntry}`);
        gitDir = path.resolve(worktreePath, match[1].trim());
        const gitDirStat = await fs.stat(gitDir);
        if (!gitDirStat.isDirectory()) throw new Error(`Git directory is not a directory: ${gitDir}`);
    } else {
        throw new Error(`Invalid Git metadata entry: ${gitEntry}`);
    }

    return path.join(gitDir, markerFileName);
}

export async function markMultiRepositoryWorktree(worktreePath: string): Promise<void> {
    const markerPath = await getMarkerPath(worktreePath);
    await fs.writeFile(markerPath, JSON.stringify({ version: 1 }) + '\n', 'utf8');
}

export async function isMarkedMultiRepositoryWorktree(worktreePath: string): Promise<boolean> {
    try {
        const markerPath = await getMarkerPath(worktreePath);
        const stat = await fs.stat(markerPath);
        return stat.isFile();
    } catch {
        return false;
    }
}

function stripRemotePath(remotePath: string): string {
    let result = remotePath;
    while (result.startsWith('/')) result = result.slice(1);
    while (result.endsWith('/')) result = result.slice(0, -1);
    if (result.toLowerCase().endsWith('.git')) result = result.slice(0, -4);
    return result;
}

function normalizeRemote(remote: string): string {
    const value = remote.trim();
    const backslash = String.fromCharCode(92);
    const isWindowsDrivePath =
        value.length >= 3 && /^[a-zA-Z]:/.test(value) && (value[2] === '/' || value[2] === backslash);

    if (!value.includes('://') && !isWindowsDrivePath) {
        const colonIndex = value.indexOf(':');
        const hostAndUser = colonIndex > 0 ? value.slice(0, colonIndex) : '';
        if (hostAndUser && !hostAndUser.includes('/') && !hostAndUser.includes(backslash)) {
            const host = hostAndUser.slice(hostAndUser.lastIndexOf('@') + 1).toLowerCase();
            let remotePath = stripRemotePath(value.slice(colonIndex + 1));
            if (host === 'github.com') remotePath = remotePath.toLowerCase();
            return host + '/' + remotePath;
        }
    }

    try {
        const url = new URL(value);
        if (['file:', 'git:', 'http:', 'https:', 'ssh:'].includes(url.protocol)) {
            const isDefaultPort =
                (url.protocol === 'http:' && url.port === '80') ||
                (url.protocol === 'https:' && url.port === '443') ||
                (url.protocol === 'ssh:' && url.port === '22');
            const port = url.port && !isDefaultPort ? ':' + url.port : '';
            const host = url.hostname.toLowerCase() + port;
            let remotePath = stripRemotePath(url.pathname);
            if (url.hostname.toLowerCase() === 'github.com') remotePath = remotePath.toLowerCase();
            return host + '/' + remotePath;
        }
    } catch {
        // Local paths and non-URL remotes are compared in their literal form below.
    }

    let normalized = value.split(backslash).join('/');
    while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    if (normalized.toLowerCase().endsWith('.git')) normalized = normalized.slice(0, -4);
    return normalized;
}

export async function hasConfiguredRemote(repoPath: string, configuredRemote: string): Promise<boolean> {
    const { stdout } = await execAuto(repoPath, ['remote', '-v']);
    const expected = normalizeRemote(configuredRemote);
    const remoteUrls = stdout
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/)[1])
        .filter((remote): remote is string => Boolean(remote));
    return remoteUrls.some((remote) => normalizeRemote(remote) === expected);
}

export function normalizeRepositoryPath(targetPath: string): string {
    return toSimplePath(path.resolve(targetPath));
}

export function isNestedPath(parent: string, candidate: string): boolean {
    const relative = path.relative(parent, candidate);
    return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

export async function resolveCanonicalPath(targetPath: string): Promise<string> {
    const absolutePath = path.resolve(targetPath);
    const root = path.parse(absolutePath).root;
    const segments = path.relative(root, absolutePath).split(path.sep).filter(Boolean);
    let current = root;

    for (let i = 0; i < segments.length; i++) {
        const nextPath = path.join(current, segments[i]);
        try {
            await fs.lstat(nextPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return path.resolve(current, ...segments.slice(i));
            }
            throw error;
        }
        current = await fs.realpath(nextPath);
    }

    return current;
}

export function isPathWithinRoot(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
