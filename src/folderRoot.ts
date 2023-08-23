import * as vscode from 'vscode';
import { updateTreeDataEvent } from './events';

class WorkspaceFolderRoot implements vscode.Disposable {
    private _uri?: vscode.Uri;
    private _workspaceWatcher: vscode.Disposable;
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
    dispose() {
        this._workspaceWatcher.dispose();
    }
}

export default new WorkspaceFolderRoot();
