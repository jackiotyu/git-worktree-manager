import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { Config } from '@/core/config/setting';

export async function copyWorktreeFiles(sourceRepo: string, targetWorktree: string, token: vscode.CancellationToken) {
    const abortSignal = new AbortController();
    const dispose = token.onCancellationRequested(() => abortSignal.abort());
    try {
        const patterns = Config.get('worktreeCopyPatterns', []).filter((i) => i);
        const ignorePatterns = Config.get('worktreeCopyIgnores', []).filter((i) => i);

        if (patterns.length === 0) return;

        // Stop if the operation is cancelled
        if (token.isCancellationRequested) return;

        // Find matching files
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(sourceRepo, `{${patterns.join(',')}}`),
            ignorePatterns.length > 0 ? `{${ignorePatterns.join(',')}}` : null,
            void 0,
            token
        );

        // Copy the found files
        for (const file of files) {
            // Stop if the operation is cancelled
            if (token.isCancellationRequested) return;

            const relativePath = path.relative(sourceRepo, file.fsPath);
            const targetPath = path.join(targetWorktree, relativePath);
            const targetDir = path.dirname(targetPath);

            // Ensure target directory exists
            await fs.mkdir(targetDir, { recursive: true });

            // Copy single file
            await pipeline(
                createReadStream(file.fsPath),
                createWriteStream(targetPath),
                { signal: abortSignal.signal },
            );
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to copy files: {error}', { error }));
    } finally {
        dispose.dispose();
    }
}
