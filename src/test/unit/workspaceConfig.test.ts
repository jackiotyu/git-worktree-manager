import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import path from 'path';
import { loadConfig } from '../../core/util/workspaceConfig';

const files = new Map<string, string>();
const readErrors = new Map<string, Error & { code?: string }>();
let readFileCalls: string[] = [];

rs.mock('fs/promises', () => ({
    readFile: rs.fn(async (filePath: string) => {
        readFileCalls.push(filePath);
        const error = readErrors.get(filePath);
        if (error) throw error;
        const content = files.get(filePath);
        if (content !== undefined) return content;
        throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
    }),
}));

rs.mock('vscode', () => ({
    l10n: {
        t: (message: string, ...args: string[]) =>
            args.reduce((result, arg, index) => result.replace(`{${index}}`, arg), message),
    },
}));

rs.mock('@/core/util/path', () => ({
    resolveSafeRelativePath: (root: string, relativePath: string) => path.resolve(root, relativePath),
}));

rs.mock('@/core/util/repo', () => ({
    hasGitMetadata: rs.fn(async () => true),
}));

rs.mock('@/core/util/multiRepositoryWorktree', () => ({
    isNestedPath: (parent: string, child: string) => {
        const relative = path.relative(parent, child);
        return (
            relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
        );
    },
    isPathWithinRoot: (root: string, child: string) => {
        const relative = path.relative(root, child);
        return (
            relative === '' ||
            (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
        );
    },
    normalizeRepositoryPath: (value: string) => path.normalize(value),
    resolveCanonicalPath: async (value: string) => path.resolve(value),
}));

const root = path.resolve('/workspace');
const projectConfigPath = path.join(root, '.vscode', 'gwm.json');
const rootConfigPath = path.join(root, 'gwm.json');

beforeEach(() => {
    files.clear();
    readErrors.clear();
    readFileCalls = [];
});

describe('loadConfig', () => {
    it('prefers .vscode/gwm.json and resolves parent relative to that file', async () => {
        files.set(
            projectConfigPath,
            JSON.stringify({ version: 1, parent: '..', repo: { child: { name: 'Project config' } } }),
        );
        files.set(rootConfigPath, JSON.stringify({ version: 1, repo: { legacy: { name: 'Root config' } } }));

        const repos = await loadConfig(root, root);

        expect(repos.map((repo) => repo.relativePath)).toEqual(['child']);
        expect(repos[0].sourcePath).toBe(path.join(root, 'child'));
    });

    it('falls back to root gwm.json when the project config is missing', async () => {
        files.set(rootConfigPath, JSON.stringify({ version: 1, repo: { child: { name: 'Root config' } } }));

        const repos = await loadConfig(root, root);

        expect(repos.map((repo) => repo.relativePath)).toEqual(['child']);
        expect(readFileCalls).toEqual([projectConfigPath, rootConfigPath]);
    });

    it('rejects invalid workspace config structure', async () => {
        const invalidConfigs = [
            { repo: { child: { name: 'Child' } } },
            { version: 2, repo: { child: { name: 'Child' } } },
            { version: 1, repo: {} },
            { version: 1, repo: { child: { name: 'Child', unknown: true } } },
            { version: 1, repo: { child: { name: '   ' } } },
            { version: 1, repo: { child: { name: 'Child', remote: '   ' } } },
        ];

        for (const config of invalidConfigs) {
            files.set(rootConfigPath, JSON.stringify(config));
            await expect(loadConfig(root, root)).rejects.toThrow('Invalid gwm.json');
            files.delete(rootConfigPath);
        }
    });

    it('does not hide project config read errors by falling back to the root config', async () => {
        readErrors.set(projectConfigPath, Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
        files.set(rootConfigPath, JSON.stringify({ version: 1, repo: { child: { name: 'Root config' } } }));

        await expect(loadConfig(root, root)).rejects.toThrow('Permission denied');
        expect(readFileCalls).toEqual([projectConfigPath]);
    });
});
