import * as vscode from 'vscode';
import { IWorktreeLess } from '@/types';
import folderRoot from '@/core/folderRoot';
import { GitHistory } from '@/core/gitHistory';

export const viewHistoryCmd = (item?: IWorktreeLess) => {
    const uri = item ? vscode.Uri.file(item.fsPath) : folderRoot.uri;
    uri && GitHistory.openHistory(uri);
};
