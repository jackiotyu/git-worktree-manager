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

const configFileName = 'workspace.json';

let validateWorkspaceConfigPromise: Promise<import('ajv').ValidateFunction<WorkspaceConfig>> | undefined;

async function getWorkspaceConfigValidator(): Promise<import('ajv').ValidateFunction<WorkspaceConfig>> {
    if (!validateWorkspaceConfigPromise) {
        validateWorkspaceConfigPromise = Promise.all([
            import('ajv'),
            import('../../../schemas/workspace.schema.json'),
        ]).then(([ajvModule, schemaModule]) => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const Ajv = ajvModule.default;
            const schema = schemaModule.default as object;
            return new Ajv({ allErrors: true, strict: false }).compile<WorkspaceConfig>(schema);
        });
    }
    return validateWorkspaceConfigPromise;
}

export async function loadConfig(root: string, sourceRoot = root): Promise<RepoEntry[]> {
    const configPath = path.join(root, configFileName);
    let raw: string;
    try {
        raw = await fs.readFile(configPath, 'utf8');
    } catch {
        throw new Error(vscode.l10n.t('workspace.json was not found in the workspace root'));
    }

    let parsedConfig: unknown;
    try {
        parsedConfig = JSON.parse(raw);
    } catch (error) {
        throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', String(error)));
    }

    const validateWorkspaceConfig = await getWorkspaceConfigValidator();
    if (!validateWorkspaceConfig(parsedConfig)) {
        const details = (validateWorkspaceConfig.errors ?? [])
            .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
            .join('; ');
        throw new Error(vscode.l10n.t('Invalid workspace.json: {0}', details));
    }
    const config = parsedConfig as WorkspaceConfig;
    const parentPath = config.parent?.trim() ?? '';
    const repositoryRoot = parentPath ? path.resolve(root, parentPath) : sourceRoot;
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
                vscode.l10n.t(
                    'Invalid workspace.json: {0}',
                    vscode.l10n.t('Duplicate repository path: {0}', relativePath),
                ),
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
                    'Invalid workspace.json: {0}',
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
                        'Invalid workspace.json: {0}',
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
                        'Invalid workspace.json: {0}',
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
