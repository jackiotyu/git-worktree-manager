import * as vscode from 'vscode';
import { AllViewItem } from '@/core/treeView/items';
import { verifyFileExistence, checkIsFolder } from '@/core/util/file';
import { revealTreeItem } from '@/core/util/tree';
import { revealFolderInOS } from '@/core/util/external';
import { Config } from '@/core/config/setting';
import path from 'path';

export const revealInSystemExplorerCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    const fsPath = item.fsPath;
    const exist = await verifyFileExistence(fsPath);
    if (!exist) return;
    if (needRevealTreeItem) await revealTreeItem(item);
    const openInsideFolder = Config.get('openInsideFolder', false);
    const isFolder = await checkIsFolder(fsPath);
    if (openInsideFolder && isFolder) revealFolderInOS(path.resolve(fsPath));
    else vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fsPath));
};
