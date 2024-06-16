import * as vscode from 'vscode';
import path from 'path';
import { checkExist } from '@/core/util/file';
import { Alert } from '@/core/ui/message';

export const pickWorktreeDir = async (dir: string) => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(dir),
        openLabel: vscode.l10n.t('Select the folder'),
        title: vscode.l10n.t('Select the folder where you want to create the worktree'),
    });
    return uriList?.[0]?.fsPath;
};

export const inputWorktreeDir = async (baseDir: string) => {
    let canClose = true;
    // 最终路径
    let resolve: (str?: string) => void;
    let reject: (reason?: any) => void;
    const waiting = new Promise<string | undefined>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    let workTreeDir = `${baseDir}.worktree`;
    let finalWorktreeDir = path.join(workTreeDir, 'worktree1');
    const dirReg = /worktree(\d+)/;
    const inputBox = vscode.window.createInputBox();
    if (await checkExist(workTreeDir)) {
        let worktreeDirList = (await vscode.workspace.fs.readDirectory(vscode.Uri.file(workTreeDir)))
            .filter((item) => item[1] === vscode.FileType.Directory)
            .filter((item) => dirReg.test(item[0]))
            .map((item) => item[0]);
        if (worktreeDirList.length) {
            worktreeDirList.sort((a, b) => Number(b.replace(dirReg, '$1')) - Number(a.replace(dirReg, '$1')));
            const index = worktreeDirList[0].match(dirReg)![1];
            finalWorktreeDir = path.join(workTreeDir, `worktree${Number(index) + 1}`);
        }
    }
    const selectDirBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('new-folder'),
        tooltip: vscode.l10n.t('Select the folder where you want to create the worktree'),
    };
    inputBox.title = vscode.l10n.t('Input worktree directory');
    inputBox.value = finalWorktreeDir;
    inputBox.valueSelection = [workTreeDir.length + 1, finalWorktreeDir.length];
    inputBox.buttons = [selectDirBtn];
    const handleTriggerButton = async (event: vscode.QuickInputButton) => {
        if (event !== selectDirBtn) return;
        canClose = false;
        inputBox.hide();
        try {
            const dir = await pickWorktreeDir(path.dirname(baseDir));
            if (!dir) return;
            resolve(dir);
            inputBox.dispose();
        } catch (err) {
            inputBox.dispose();
            reject(err);
        } finally {
            canClose = true;
        }
    };
    const handleAccept = async () => {
        try {
            const input = inputBox.value;
            if (!input) return;
            if (input === workTreeDir) {
                return Alert.showErrorMessage(vscode.l10n.t('Please select a different directory'));
            }
            if (await checkExist(input)) {
                return Alert.showErrorMessage(vscode.l10n.t('The folder already exists'));
            }
            resolve(input);
            inputBox.hide();
            inputBox.dispose();
        } catch (error) {
            reject(error);
        }
    };
    const handleHide = () => canClose && inputBox.dispose();
    inputBox.onDidTriggerButton(handleTriggerButton);
    inputBox.onDidHide(handleHide);
    inputBox.onDidAccept(handleAccept);
    inputBox.show();
    return waiting;
};