import * as vscode from 'vscode';
import { AllViewItem } from '@/core/treeView/items';
import { verifyDirExistence } from '@/core/util/file';
import { revealTreeItem } from '@/core/util/tree';
import { revealFolderInOS } from '@/core/util/external';
import { Config } from '@/core/config/setting';
import path from 'path';

export const revealInSystemExplorerCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    if (!(await verifyDirExistence(item.path))) return;
    if (needRevealTreeItem) await revealTreeItem(item);
    const openInsideFolder = Config.get('openInsideFolder', false);
    if(openInsideFolder) revealFolderInOS(path.resolve(item.path));
    else vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.path));
};