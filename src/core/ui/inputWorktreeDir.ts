import * as vscode from 'vscode';
import path from 'path';
import { checkExist, checkIsFolder, isDirEmpty } from '@/core/util/file';
import { comparePath, getBaseWorktreeDir, getSubDir } from '@/core/util/folder';
import { Alert } from '@/core/ui/message';
import { withResolvers } from '@/core/util/promise';

export const pickWorktreeDir = async (dir: string, targetDirTip: string) => {
    const uriList = await vscode.window.showOpenDialog({
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
    hasBackButton?: boolean;
    refName?: string;
}
export const inputWorktreeDir = async ({
    baseDir,
    baseWorktreeDir,
    step,
    totalSteps,
    hasBackButton,
    targetDirTip = vscode.l10n.t('Select the folder where you want to create the worktree'),
    refName = '',
}: InputWorktreeDirOptions) => {
    let canClose = true;
    const { promise, resolve, reject } = withResolvers<string | undefined>();
    // Final path
    const workTreeDir = getBaseWorktreeDir(baseDir);
    const baseName = path.basename(baseDir);
    const dirReg = new RegExp(getSubDir(baseName, refName, '(\\d+)'));
    let finalWorktreeDir = path.join(workTreeDir, getSubDir(baseName, refName, 1));
    const inputBox = vscode.window.createInputBox();
    // When the passed baseWorktreeDir has a value and is different from workTreeDir, it indicates switching from a previously selected worktree
    if (baseWorktreeDir && !comparePath(workTreeDir, baseWorktreeDir)) {
        finalWorktreeDir = baseWorktreeDir;
    } else if (await checkExist(workTreeDir)) {
        const worktreeDirList = (await vscode.workspace.fs.readDirectory(vscode.Uri.file(workTreeDir)))
            .filter((item) => item[1] === vscode.FileType.Directory)
            .filter((item) => dirReg.test(item[0]))
            .map((item) => item[0]);
        if (worktreeDirList.length) {
            worktreeDirList.sort((a, b) => Number(b.replace(dirReg, '$1')) - Number(a.replace(dirReg, '$1')));
            const index = worktreeDirList[0].match(dirReg)![1];
            finalWorktreeDir = path.join(workTreeDir, getSubDir(baseName, refName, Number(index) + 1));
        }
    }
    const selectDirBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('new-folder'),
        tooltip: targetDirTip,
    };
    inputBox.title = vscode.l10n.t('Enter worktree directory');
    inputBox.value = finalWorktreeDir;
    inputBox.valueSelection = [workTreeDir.length + 1, finalWorktreeDir.length];
    inputBox.buttons = hasBackButton ? [selectDirBtn, vscode.QuickInputButtons.Back] : [selectDirBtn];
    inputBox.step = step;
    inputBox.totalSteps = totalSteps;
    const handleTriggerButton = async (event: vscode.QuickInputButton) => {
        if (event === vscode.QuickInputButtons.Back) {
            resolve(undefined);
            inputBox.dispose();
        }
        if (event !== selectDirBtn) return;
        canClose = false;
        inputBox.hide();
        try {
            const dir = await pickWorktreeDir(path.dirname(baseDir), targetDirTip);
            if (!dir) return inputBox.show();
            inputBox.value = verifySameDir(dir, workTreeDir) ? finalWorktreeDir : dir;
            inputBox.valueSelection = [inputBox.value.length, inputBox.value.length];
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
            const input = inputBox.value.trim();
            if (!input) return;
            const targetPath = path.isAbsolute(input) ? path.resolve(input) : path.resolve(baseDir, input);
            if (verifySameDir(targetPath, workTreeDir)) return;
            if (await checkExist(targetPath)) {
                if (!(await checkIsFolder(targetPath))) {
                    return Alert.showErrorMessage(vscode.l10n.t('The path is not a folder'));
                }
                if (!(await isDirEmpty(targetPath))) {
                    return Alert.showErrorMessage(vscode.l10n.t('The selected folder is not empty'));
                }
            }
            resolve(targetPath);
            inputBox.hide();
            inputBox.dispose();
        } catch (error) {
            reject(error);
        }
    };
    const handleHide = () => {
        if (!canClose) return;
        resolve(undefined);
        inputBox.dispose();
    };
    inputBox.onDidTriggerButton(handleTriggerButton);
    inputBox.onDidHide(handleHide);
    inputBox.onDidAccept(handleAccept);
    inputBox.show();
    return promise;
};
