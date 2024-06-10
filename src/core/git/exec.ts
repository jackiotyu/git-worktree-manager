import * as vscode from 'vscode';
import folderRoot from '@/core/folderRoot';
import { execBase } from '@/core/git/exec-base';

export const exec = (args?: string[], token?: vscode.CancellationToken): Promise<string> => {
    return execBase(folderRoot.uri?.fsPath || '', args, token);
};

export const execAuto = (cwd: string = '', args?: string[], token?: vscode.CancellationToken) => {
    if (!cwd) return exec(args, token);
    return execBase(cwd, args, token);
};

export { execBase };