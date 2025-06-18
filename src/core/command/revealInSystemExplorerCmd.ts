import * as vscode from 'vscode';
import { AllViewItem } from '@/core/treeView/items';
import { verifyDirExistence, checkIsFolder } from '@/core/util/file';
import { revealTreeItem } from '@/core/util/tree';
import { revealFolderInOS } from '@/core/util/external';
import { Config } from '@/core/config/setting';
import path from 'path';

export const revealInSystemExplorerCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    if (!(await verifyDirExistence(item.fsPath))) return;
    if (needRevealTreeItem) await revealTreeItem(item);
    const openInsideFolder = Config.get('openInsideFolder', false);
    const isFolder = await checkIsFolder(item.fsPath);
    if (openInsideFolder && isFolder) revealFolderInOS(path.resolve(item.fsPath));
    else vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.fsPath));
};
