import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs/promises';
import type { Stats } from 'fs';
import { stream as fgStream } from 'fast-glob';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { Config } from '@/core/config/setting';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';
import { isSubPath } from '@/core/util/folder';

async function copyFile(source: string, target: string, stat: Stats, signal: AbortSignal) {
    if (stat.isDirectory()) {
        await fs.mkdir(target, { recursive: true });
    } else {
        const targetDir = path.dirname(target);
        await fs.mkdir(targetDir, { recursive: true });
        await pipeline(createReadStream(source), createWriteStream(target), { signal });
    }
}

/**
 * Copy symbolic link to target location
 * @param source Source symbolic link path
 * @param target Target symbolic link path
 */
async function copySymbolicLink(source: string, target: string) {
    const targetDir = path.dirname(target);
    const sourceDir = path.dirname(source);

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Get the actual path that the symbolic link points to
    const realTargetPath = await fs.realpath(source);
    const linkStat = await fs.stat(realTargetPath);

    // Determine link type based on target type
    const linkType: 'file' | 'dir' | 'junction' = linkStat.isDirectory() ? 'dir' : 'file';

    // Calculate the new link path relative to the target directory
    if (isSubPath(sourceDir, realTargetPath)) {
        const relativePath = path.relative(sourceDir, realTargetPath);
        const linkTarget = path.resolve(targetDir, relativePath);
        await fs.symlink(linkTarget, target, linkType);
    } else {
        await fs.symlink(realTargetPath, target, linkType);
    }
}

/**
 * Find files matching configured patterns
 * @param sourceRepo Source repository path
 * @param token Cancellation token
 * @returns Array of matched file URIs
 */
async function findMatchingFiles(sourceRepo: string, token: vscode.CancellationToken): Promise<vscode.Uri[]> {
    const patterns = Config.get('worktreeCopyPatterns', []).filter(Boolean);
    const ignorePatterns = Config.get('worktreeCopyIgnores', []).filter(Boolean);

    // Return empty array if no patterns configured
    if (patterns.length === 0) {
        return [];
    }

    const matchedFiles: string[] = [];
    const stream = fgStream(patterns, {
        ignore: ignorePatterns,
        absolute: true,
        cwd: sourceRepo,
        dot: true,
        followSymbolicLinks: false,
        onlyFiles: false,
    });

    try {
        for await (const file of stream) {
            matchedFiles.push(file.toString());

            // Check if cancellation is requested
            if (token.isCancellationRequested) {
                break;
            }
        }
    } catch (err) {
        // Ignore abort errors, rethrow other errors
        if (err instanceof Error && err.name !== 'AbortError') {
            throw err;
        }
    }

    return matchedFiles.map(filepath => vscode.Uri.file(filepath));
}

export async function copyWorktreeFiles(sourceRepo: string, targetWorktree: string) {
    const waitingCopy = withResolvers<void>();
    const tokenSource = new vscode.CancellationTokenSource();
    const abortController = new AbortController();
    let disposeAbortSignal: vscode.Disposable | undefined;

    try {
        // Setup cancellation handling
        disposeAbortSignal = tokenSource.token.onCancellationRequested(() => {
            abortController.abort();
        });

        // Find and copy files
        const files = await findMatchingFiles(sourceRepo, tokenSource.token);
        if (files.length === 0) return;

        // Start progress indication
        actionProgressWrapper(
            vscode.l10n.t('Copying files to worktree {path}', { path: targetWorktree }),
            () => waitingCopy.promise,
            () => {},
            tokenSource,
        );

        for (const file of files) {
            if (tokenSource.token.isCancellationRequested) break;

            const relativePath = path.relative(sourceRepo, file.fsPath);
            const targetPath = path.join(targetWorktree, relativePath);
            const stat = await fs.lstat(file.fsPath);
            if (stat.isSymbolicLink()) {
                await copySymbolicLink(file.fsPath, targetPath);
            } else {
                await copyFile(file.fsPath, targetPath, stat, abortController.signal);
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            // Ignore abort errors
            return;
        }
        vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to copy files: {error}', { error: error.message || error }),
        );
    } finally {
        disposeAbortSignal?.dispose();
        tokenSource.dispose();
        waitingCopy.resolve();
    }
}
