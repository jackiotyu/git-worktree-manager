import * as vscode from 'vscode';
import fs from 'fs/promises';
import path from 'path';
import { resolveSafeRelativePath } from '@/core/util/path';
import type { RepoEntry, WorkspaceConfig } from '@/types';
import { hasGitMetadata } from '@/core/util/repo';
import {
    isNestedPath,
    isPathWithinRoot,
    normalizeRepositoryPath,
    resolveCanonicalPath,
} from '@/core/util/multiRepositoryWorktree';

const configFileName = 'gwm.json';
const configFilePaths = (root: string) => [path.join(root, '.vscode', configFileName), path.join(root, configFileName)];

function validateWorkspaceConfig(value: unknown): string | undefined {
    const invalid = (path: string, message: string) => `${path} ${message}`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return invalid('/', 'must be an object');
    }

    const config = value as Record<string, unknown>;
    if (Object.keys(config).some((key) => !['version', 'parent', 'repo'].includes(key))) {
        return invalid('/', 'must NOT have additional properties');
    }
    if (config.version !== 1) return invalid('/version', 'must be equal to constant');
    if (config.parent !== undefined && (typeof config.parent !== 'string' || !/\S/.test(config.parent))) {
        return invalid('/parent', 'must be a non-empty string');
    }
    if (!config.repo || typeof config.repo !== 'object' || Array.isArray(config.repo)) {
        return invalid('/repo', 'must be an object');
    }

    const repos = config.repo as Record<string, unknown>;
    const paths = Object.keys(repos);
    if (!paths.length) return invalid('/repo', 'must NOT have fewer than 1 properties');
    for (const repoPath of paths) {
        if (
            !repoPath ||
            repoPath.startsWith('/') ||
            repoPath.startsWith('\\') ||
            /^[A-Za-z]:/.test(repoPath) ||
            /[:*?"<>|]/.test(repoPath) ||
            repoPath.split(/[\\/]/).some((part) => part === '.' || part === '..')
        ) {
            return invalid(`/repo/${repoPath}`, 'must be a safe relative path');
        }

        const repo = repos[repoPath];
        if (!repo || typeof repo !== 'object' || Array.isArray(repo)) {
            return invalid(`/repo/${repoPath}`, 'must be an object');
        }
        const entry = repo as Record<string, unknown>;
        if (Object.keys(entry).some((key) => !['name', 'remote'].includes(key))) {
            return invalid(`/repo/${repoPath}`, 'must NOT have additional properties');
        }
        if (typeof entry.name !== 'string' || !/\S/.test(entry.name)) {
            return invalid(`/repo/${repoPath}/name`, 'must be a non-empty string');
        }
        if (entry.remote !== undefined && (typeof entry.remote !== 'string' || !/\S/.test(entry.remote))) {
            return invalid(`/repo/${repoPath}/remote`, 'must be a non-empty string');
        }
    }
    return undefined;
}

export async function loadConfig(root: string, sourceRoot = root): Promise<RepoEntry[]> {
    let configPath = '';
    let raw: string | undefined;
    for (const candidate of configFilePaths(root)) {
        try {
            raw = await fs.readFile(candidate, 'utf8');
            configPath = candidate;
            break;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
    }
    if (raw === undefined) {
        throw new Error(vscode.l10n.t('gwm.json was not found in the workspace root or .vscode folder'));
    }

    let parsedConfig: unknown;
    try {
        parsedConfig = JSON.parse(raw);
    } catch (error) {
        throw new Error(vscode.l10n.t('Invalid gwm.json: {0}', String(error)));
    }

    const validationError = validateWorkspaceConfig(parsedConfig);
    if (validationError) {
        throw new Error(vscode.l10n.t('Invalid gwm.json: {0}', validationError));
    }
    const config = parsedConfig as WorkspaceConfig;
    const parentPath = config.parent?.trim() ?? '';
    const repositoryRoot = parentPath ? path.resolve(path.dirname(configPath), parentPath) : sourceRoot;
    if (parentPath && !(await hasGitMetadata(repositoryRoot))) {
        throw new Error(vscode.l10n.t('Configured parent path is not a Git repository: {0}', repositoryRoot));
    }

    const repos: RepoEntry[] = [];
    const seenPaths = new Set<string>();
    for (const [relativePath, value] of Object.entries(config.repo)) {
        const sourcePath = resolveSafeRelativePath(repositoryRoot, relativePath);
        const normalized = normalizeRepositoryPath(sourcePath);
        if (seenPaths.has(normalized)) {
            throw new Error(
                vscode.l10n.t('Invalid gwm.json: {0}', vscode.l10n.t('Duplicate repository path: {0}', relativePath)),
            );
        }
        seenPaths.add(normalized);
        repos.push({ relativePath, name: value.name, remote: value.remote, sourcePath });
    }
    const canonicalRoot = normalizeRepositoryPath(await resolveCanonicalPath(repositoryRoot));
    const canonicalPaths = await Promise.all(repos.map((repo) => resolveCanonicalPath(repo.sourcePath)));
    const normalizedCanonicalPaths = canonicalPaths.map(normalizeRepositoryPath);

    for (let i = 0; i < repos.length; i++) {
        if (!isPathWithinRoot(canonicalRoot, normalizedCanonicalPaths[i])) {
            throw new Error(
                vscode.l10n.t(
                    'Invalid gwm.json: {0}',
                    vscode.l10n.t(
                        'Repository path resolves outside the configured parent root: {0}',
                        repos[i].relativePath,
                    ),
                ),
            );
        }

        for (let j = i + 1; j < repos.length; j++) {
            const first = repos[i];
            const second = repos[j];
            if (normalizedCanonicalPaths[i] === normalizedCanonicalPaths[j]) {
                throw new Error(
                    vscode.l10n.t(
                        'Invalid gwm.json: {0}',
                        vscode.l10n.t('Duplicate repository path: {0}', second.relativePath),
                    ),
                );
            }
            if (
                isNestedPath(normalizedCanonicalPaths[i], normalizedCanonicalPaths[j]) ||
                isNestedPath(normalizedCanonicalPaths[j], normalizedCanonicalPaths[i])
            ) {
                throw new Error(
                    vscode.l10n.t(
                        'Invalid gwm.json: {0}',
                        vscode.l10n.t(
                            'Overlapping repository paths: {0} and {1}',
                            first.relativePath,
                            second.relativePath,
                        ),
                    ),
                );
            }
        }
    }
    return repos;
}
