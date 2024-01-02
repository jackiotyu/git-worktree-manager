import * as vscode from 'vscode';
import { worktreeChangeEvent } from '@/lib/events';
import logger from '@/lib/logger';

const worktreeGlob = 'worktrees/*/HEAD,worktrees/*/index';
const watcherGlob = `{config,HEAD,index,${worktreeGlob}}`;

class WorktreeEvent implements vscode.Disposable {
    disposables: vscode.Disposable[] = [];
    constructor(private readonly uri: vscode.Uri) {
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.uri, watcherGlob));
        this.disposables.push(
            watcher,
            watcher.onDidChange(this.onChange),
            watcher.onDidCreate(this.onChange),
            watcher.onDidDelete(this.onChange),
        );
    }
    onChange(event: vscode.Uri) {
        logger.log(`'repository change' ${event.fsPath}`);
        worktreeChangeEvent.fire(event);
    }
    dispose() {
        this.disposables.forEach((i) => i.dispose());
        this.disposables.length = 0;
    }
}

class WorktreeEventRegister implements vscode.Disposable {
    private eventMap: Map<string, WorktreeEvent> = new Map();
    disposables: vscode.Disposable[] = [];
    add(uri: vscode.Uri) {
        const finalUri = uri.fsPath.endsWith('.git') ? uri : vscode.Uri.joinPath(uri, '.git');
        const folderPath = finalUri.fsPath;
        if (this.eventMap.has(folderPath)) return;
        logger.log(`'watching repository' ${folderPath}`);
        const worktreeEvent = new WorktreeEvent(finalUri);
        this.eventMap.set(folderPath, worktreeEvent);
        this.disposables.push(worktreeEvent);
    }
    remove(uri: vscode.Uri) {
        const finalUri = uri.fsPath.endsWith('.git') ? uri : vscode.Uri.joinPath(uri, '.git');
        const folderPath = finalUri.fsPath;
        this.eventMap.get(folderPath)?.dispose();
        const success = this.eventMap.delete(folderPath);
        success && logger.log(`'unwatch repository' ${folderPath}`);
    }
    dispose() {
        this.disposables.forEach((i) => i.dispose());
        this.disposables.length = 0;
        this.eventMap.clear();
    }
}

const worktreeEventRegister = new WorktreeEventRegister();

export { worktreeEventRegister };
