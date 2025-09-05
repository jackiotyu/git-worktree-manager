import * as vscode from 'vscode';
import path from 'path';
import { checkExist, isDirEmpty } from '@/core/util/file';
import { comparePath, getBaseWorktreeDir, getSubDir } from '@/core/util/folder';
import { Alert } from '@/core/ui/message';
import { withResolvers } from '@/core/util/promise';

export const pickWorktreeDir = async (dir: string, targetDirTip: string) => {
    let uriList = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(dir),
        openLabel: vscode.l10n.t('Select folder'),
        title: targetDirTip,
    });
    return uriList?.[0]?.fsPath;
};

const verifySameDir = (dir: string, baseDir: string) => {
    if (comparePath(path.resolve(dir), path.resolve(baseDir))) {
        Alert.showErrorMessage(vscode.l10n.t('Please select a different directory'));
        return true;
    }
    return false;
};

interface InputWorktreeDirOptions {
    baseDir: string;
    baseWorktreeDir?: string;
    step?: number;
    totalSteps?: number;
    targetDirTip?: string;
}
export const inputWorktreeDir = async ({
    baseDir,
    baseWorktreeDir,
    step,
    totalSteps,
    targetDirTip = vscode.l10n.t('Select the folder where you want to create the worktree'),
}: InputWorktreeDirOptions) => {
    let canClose = true;
    const { promise, resolve, reject } = withResolvers<string | undefined>();
    // 最终路径
    const workTreeDir = getBaseWorktreeDir(baseDir);
    const baseName = path.basename(baseDir);
    const dirReg = new RegExp(getSubDir(baseName, '(\\d+)'));
    let finalWorktreeDir = path.join(workTreeDir, getSubDir(baseName, 1));
    const inputBox = vscode.window.createInputBox();
    // 传入的 baseWorktreeDir 有值，且和 workTreeDir 不同，说明是从已选择的 worktree 切换过来
    if (baseWorktreeDir && !comparePath(workTreeDir, baseWorktreeDir)) {
        finalWorktreeDir = baseWorktreeDir;
    } else if (await checkExist(workTreeDir)) {
        let worktreeDirList = (await vscode.workspace.fs.readDirectory(vscode.Uri.file(workTreeDir)))
            .filter((item) => item[1] === vscode.FileType.Directory)
            .filter((item) => dirReg.test(item[0]))
            .map((item) => item[0]);
        if (worktreeDirList.length) {
            worktreeDirList.sort((a, b) => Number(b.replace(dirReg, '$1')) - Number(a.replace(dirReg, '$1')));
            const index = worktreeDirList[0].match(dirReg)![1];
            finalWorktreeDir = path.join(workTreeDir, getSubDir(baseName, Number(index) + 1));
        }
    }
    const selectDirBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('new-folder'),
        tooltip: targetDirTip,
    };
    inputBox.title = vscode.l10n.t('Enter worktree directory');
    inputBox.value = finalWorktreeDir;
    inputBox.valueSelection = [workTreeDir.length + 1, finalWorktreeDir.length];
    inputBox.buttons = [selectDirBtn];
    inputBox.step = step;
    inputBox.totalSteps = totalSteps;
    const handleTriggerButton = async (event: vscode.QuickInputButton) => {
        if (event !== selectDirBtn) return;
        canClose = false;
        inputBox.hide();
        try {
            const dir = await pickWorktreeDir(path.dirname(baseDir), targetDirTip);
            if (!dir) return inputBox.show();
            inputBox.value = verifySameDir(dir, workTreeDir) ? finalWorktreeDir : dir;
            inputBox.show();
        } catch (err) {
            if (err instanceof Error) Alert.showErrorMessage(err.message);
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
            if (verifySameDir(input, workTreeDir)) return;
            if (!(await isDirEmpty(input))) {
                return Alert.showErrorMessage(vscode.l10n.t('The selected folder is not empty'));
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
    return promise;
};
