import * as vscode from "vscode";
import { verifyDirExistence } from '@/core/util/file';
import { judgeIncludeFolder } from '@/core/util/folder';
import { getTerminalLocationConfig, getTerminalCmdListConfig } from '@/core/util/state';
import { AllViewItem } from '@/core/treeView/items';

interface CmdItem extends vscode.QuickPickItem {
    use?: 'close';
}

export const openTerminalCmd = async (item?: AllViewItem) => {
    if (!item) return;
    const fsPath = item.fsPath;
    if (!(await verifyDirExistence(fsPath))) return;
    const terminal = vscode.window.createTerminal({
        cwd: fsPath,
        name: `${item.name} ⇄ ${fsPath}`,
        color: judgeIncludeFolder(fsPath) ? new vscode.ThemeColor('terminal.ansiBlue') : void 0,
        iconPath: new vscode.ThemeIcon('terminal-bash'),
        isTransient: false,
        hideFromUser: false,
        location: getTerminalLocationConfig(),
    });
    terminal.show();
    const cmdList = getTerminalCmdListConfig();
    if (!cmdList.length) return;
    const watchOpenTerminal = vscode.window.onDidOpenTerminal(async t => {
        let [pid, currentPid] = await Promise.all([t.processId, terminal.processId]);
        if(pid !== currentPid) return;
        let cmdText = cmdList[0];
        watchOpenTerminal.dispose();
        // 单个
        if(cmdList.length <= 1) {
            cmdText && terminal.sendText(cmdText, true);
            return;
        }
        const close = () => {
            cancelToken.cancel();
            disposable.dispose();
        };
        // 多选
        let cancelToken = new vscode.CancellationTokenSource();
        let disposable = vscode.window.onDidCloseTerminal(async (t) => {
            if((await t.processId) !== currentPid) return;
            close();
        });
        const items: CmdItem[] = cmdList.map((text) => ({
            label: text,
            iconPath: new vscode.ThemeIcon('terminal-bash'),
        }));
        let item = await vscode.window.showQuickPick(
            items,
            {
                title: vscode.l10n.t('Select command'),
                placeHolder: vscode.l10n.t('Select the command you need to execute in the terminal'),
                canPickMany: false,
            },
            cancelToken.token,
        );
        close();
        cmdText = item && item.use !== 'close' ? item.label : '';
        cmdText && terminal.sendText(cmdText, true);
    });
};