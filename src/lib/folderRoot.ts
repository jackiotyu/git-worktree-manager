import * as vscode from 'vscode';
import { updateTreeDataEvent } from '@/lib/events';

class WorkspaceFolderRoot implements vscode.Disposable {
    private _uri?: vscode.Uri;
    private _workspaceWatcher: vscode.Disposable;
    private _folderSet: Set<string> = new Set();
    constructor() {
        this._workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.checkUri();
            updateTreeDataEvent.fire();
        });
        this.checkUri();
    }
    private checkUri() {
        const folders = vscode.workspace.workspaceFolders;
        const workspaceFile = vscode.workspace.workspaceFile;
        this._folderSet = new Set(folders?.map(i => i.uri.fsPath.toLocaleLowerCase().replace(/\\/g, '/')).filter(i => i));
        if(workspaceFile) {
            this._uri = workspaceFile;
        } else if(folders?.length === 1) {
            this._uri = folders[0].uri;
        } else {
            this._uri = void 0;
        }
    }
    get uri() {
        return this._uri;
    }
    get folderPathSet() {
        return this._folderSet;
    }
    dispose() {
        this._workspaceWatcher.dispose();
    }
}

export default new WorkspaceFolderRoot();
