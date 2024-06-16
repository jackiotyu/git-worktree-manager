import * as vscode from 'vscode';
import path from 'path';
import { checkExist } from '@/core/util/file';
import { comparePath } from '@/core/util/folder';
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

const verifySameDir = (dir: string, baseDir: string) => {
    if(comparePath(path.resolve(dir), path.resolve(baseDir))) {
        Alert.showErrorMessage(vscode.l10n.t('Please select a different directory'));
        return true;
    }
    return false;
};

// 暂时写死主文件夹加.worktree后缀
const getBaseWorktreeDir = (baseDir: string) => `${baseDir}.worktree`;

export const inputWorktreeDir = async (baseDir: string, baseWorktreeDir?: string) => {
    let canClose = true;
    // 最终路径
    let resolve: (str?: string) => void;
    let reject: (reason?: any) => void;
    const waiting = new Promise<string | undefined>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    const workTreeDir = getBaseWorktreeDir(baseDir);
    let finalWorktreeDir = path.join(workTreeDir, 'worktree1');
    const dirReg = /worktree(\d+)/;
    const inputBox = vscode.window.createInputBox();
    // 传入的 baseWorktreeDir 有值，且和 workTreeDir 不同，说明是从已选择的 worktree 切换过来
    if(baseWorktreeDir && !comparePath(workTreeDir, baseWorktreeDir)) {
        finalWorktreeDir = baseWorktreeDir;
    } else if (await checkExist(workTreeDir)) {
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
            if(verifySameDir(dir, workTreeDir)) {
                inputBox.value = finalWorktreeDir;
                inputBox.show();
                return;
            }
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
            if(verifySameDir(input, workTreeDir)) return;
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
