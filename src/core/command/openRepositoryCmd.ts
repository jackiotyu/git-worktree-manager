import * as vscode from 'vscode';
import { IWorktreeLess } from '@/types';

const openRepository = (fsPath: string) => {
    vscode.commands.executeCommand('git.openRepository', fsPath);
};

export const openRepositoryCmd = (item: IWorktreeLess) => {
    openRepository(item.fsPath);
};

export const openRepositoryContextCmd = (uri: vscode.Uri) => {
    openRepository(uri.fsPath);
};
