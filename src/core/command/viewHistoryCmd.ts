import * as vscode from 'vscode';
import { GitFolderItem } from '@/core/treeView/items';
import folderRoot from '@/core/folderRoot';
import { GitHistory } from '@/core/gitHistory';

export const viewHistoryCmd = (item?: GitFolderItem) => {
    let uri = item ? vscode.Uri.file(item.fsPath) : folderRoot.uri;
    uri && GitHistory.openHistory(uri);
};
