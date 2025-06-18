import * as vscode from "vscode";
import { verifyDirExistence } from '@/core/util/file';
import { revealTreeItem } from '@/core/util/tree';
import { openExternalTerminal } from '@/core/util/external';
import { AllViewItem } from '@/core/treeView/items';
import { Alert } from '@/core/ui/message';

export const openExternalTerminalCmd = async (item?: AllViewItem, needRevealTreeItem = true) => {
    if (!item) return;
    const fsPath = item.fsPath;
    if (!(await verifyDirExistence(fsPath))) return;
    try {
        if (needRevealTreeItem) await revealTreeItem(item);
        await openExternalTerminal(`${fsPath}`);
    } catch (error) {
        Alert.showErrorMessage(vscode.l10n.t('Opening External Terminal failed\n\n {0}', String(error)));
    }
};