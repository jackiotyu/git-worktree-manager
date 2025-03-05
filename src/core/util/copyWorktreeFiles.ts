import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { Config } from '@/core/config/setting';
import { actionProgressWrapper } from '@/core/ui/progress';
import { withResolvers } from '@/core/util/promise';

async function copyFile(source: string, target: string, signal: AbortSignal) {
    const targetDir = path.dirname(target);
    await fs.mkdir(targetDir, { recursive: true });
    await pipeline(
        createReadStream(source),
        createWriteStream(target),
        { signal }
    );
}

async function findMatchingFiles(sourceRepo: string, token: vscode.CancellationToken) {
    const patterns = Config.get('worktreeCopyPatterns', []).filter(Boolean);
    const ignorePatterns = Config.get('worktreeCopyIgnores', []).filter(Boolean);

    if (patterns.length === 0) {
        return [];
    }

    return vscode.workspace.findFiles(
        new vscode.RelativePattern(sourceRepo, `{${patterns.join(',')}}`),
        ignorePatterns.length > 0 ? `{${ignorePatterns.join(',')}}` : null,
        void 0,
        token
    );
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
        if(files.length === 0) return;

        // Start progress indication
        actionProgressWrapper(
            vscode.l10n.t('Copying files to worktree {path}', { path: targetWorktree }),
            () => waitingCopy.promise,
            () => {},
            tokenSource
        );
        
        for (const file of files) {
            if (tokenSource.token.isCancellationRequested) break;

            const relativePath = path.relative(sourceRepo, file.fsPath);
            const targetPath = path.join(targetWorktree, relativePath);
            
            await copyFile(file.fsPath, targetPath, abortController.signal);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            // Ignore abort errors
            return;
        }
        vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to copy files: {error}', { error: error.message || error })
        );
    } finally {
        disposeAbortSignal?.dispose();
        tokenSource.dispose();
        waitingCopy.resolve();
    }
}
