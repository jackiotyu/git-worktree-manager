import * as vscode from "vscode";
import { WorkspaceState, GlobalState } from '@/core/state';
import { worktreeEventRegister } from '@/core/event/git';

export const watchWorktreeEventCmd = () => {
    // 手动打开监听
    queueMicrotask(() => {
        const folders = [
            ...new Set([
                ...WorkspaceState.get('mainFolders', []).map((i) => i.path),
                ...GlobalState.get('gitFolders', []).map((i) => i.path),
            ]),
        ];
        folders.forEach((folderPath) => {
            worktreeEventRegister.add(vscode.Uri.file(folderPath));
        });
    });
};