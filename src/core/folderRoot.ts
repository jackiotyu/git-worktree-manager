import * as vscode from 'vscode';

class WorkspaceFolderRoot implements vscode.Disposable {
    private _uri?: vscode.Uri;
    private _workspaceWatcher: vscode.Disposable;
    private _folderSet: Set<string> = new Set();
    constructor() {
        this._workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.checkUri();
        });
        this.checkUri();
    }
    private checkUri() {
        const folders = vscode.workspace.workspaceFolders || [];
        this._folderSet = new Set(folders.map(i => i.uri.fsPath.toLocaleLowerCase().replace(/\\/g, '/')).filter(i => i));
        // TODO Special handling for multiple workspaces
        if(folders.length) {
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
