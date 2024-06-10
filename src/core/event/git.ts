import * as vscode from 'vscode';
import { worktreeChangeEvent } from '@/core/event/events';
import logger from '@/core/log/logger';
import fs from 'fs';

const worktreeGlob = 'worktrees/*/HEAD,worktrees/*/index,worktrees/*/locked,worktrees/*/gitdir';
const watcherGlob = `{config,index,refs/remotes/**,${worktreeGlob}}`;

class WorktreeEvent implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    constructor(readonly uri: vscode.Uri) {
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.uri, watcherGlob));
        this.disposables.push(
            watcher,
            watcher.onDidChange(this.onChange),
            watcher.onDidCreate(this.onChange),
            watcher.onDidDelete(this.onChange),
        );
        logger.log(`'watching repository' ${this.uri.fsPath}`);
    }
    onChange(event: vscode.Uri) {
        logger.log(`'repository change' ${event.fsPath}`);
        worktreeChangeEvent.fire(event);
    }
    dispose() {
        this.disposables.forEach((i) => i.dispose());
        this.disposables.length = 0;
        logger.log(`'unwatch repository' ${this.uri.fsPath}`);
    }
}

class WorktreeEventRegister implements vscode.Disposable {
    private eventMap: Map<string, WorktreeEvent> = new Map();
    add(uri: vscode.Uri) {
        try {
            const finalUri = uri.fsPath.endsWith('.git') ? uri : vscode.Uri.joinPath(uri, '.git');
            const folderPath = finalUri.fsPath;
            if (this.eventMap.has(folderPath)) return;
            if (!fs.existsSync(folderPath)) return;
            const worktreeEvent = new WorktreeEvent(finalUri);
            this.eventMap.set(folderPath, worktreeEvent);
        } catch {}
    }
    remove(uri: vscode.Uri) {
        const finalUri = uri.fsPath.endsWith('.git') ? uri : vscode.Uri.joinPath(uri, '.git');
        const folderPath = finalUri.fsPath;
        this.eventMap.get(folderPath)?.dispose();
        this.eventMap.delete(folderPath);
    }
    dispose() {
        this.eventMap.forEach((event) => event.dispose());
        this.eventMap.clear();
    }
}

const worktreeEventRegister = new WorktreeEventRegister();

export { worktreeEventRegister };
