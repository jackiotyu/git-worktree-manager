import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { Config } from '@/core/config/setting';

export async function copyIgnoredFiles(sourceRepo: string, targetWorktree: string) {
    try {
        const patterns = Config.get('worktreeCopyPatterns', []);
        const ignorePatterns = Config.get('worktreeCopyIgnores', []);

        if (patterns.length === 0) return;

        // Find matching files
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(sourceRepo, `{${patterns.join(',')}}`),
            `{${ignorePatterns.join(',')}}`,
        );

        // Copy the found files
        for (const file of files) {
            const relativePath = path.relative(sourceRepo, file.fsPath);
            const targetPath = path.join(targetWorktree, relativePath);
            const targetDir = path.dirname(targetPath);

            // Ensure target directory exists
            await fs.mkdir(targetDir, { recursive: true });

            // Copy single file
            await pipeline(
                createReadStream(file.fsPath),
                createWriteStream(targetPath)
            );
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to copy files: {error}', { error }));
    }
}
