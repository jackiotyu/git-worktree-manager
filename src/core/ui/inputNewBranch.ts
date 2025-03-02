import * as vscode from 'vscode';
import { withResolvers } from '@/core/util/promise';
import { validateBranchInput } from '@/core/util/branch';
import { debounce } from 'lodash-es';

const backButton = vscode.QuickInputButtons.Back;

export const inputNewBranch = async (cwd: string, defaultValue?: string) => {
    const { promise, resolve, reject } = withResolvers<string | undefined | false>();
    const inputBox = vscode.window.createInputBox();
    inputBox.ignoreFocusOut = true;
    inputBox.value = defaultValue || vscode.workspace.getConfiguration('git').get('branchPrefix', '');
    inputBox.valueSelection = [-1, -1];
    inputBox.placeholder = vscode.l10n.t('Please input branch name');
    inputBox.prompt = vscode.l10n.t('Please input branch name');
    inputBox.buttons = [backButton];
    inputBox.onDidTriggerButton((event) => {
        if (event === backButton) {
            resolve(undefined);
            inputBox.dispose();
        }
    });
    inputBox.onDidAccept(async () => {
        const errMsg = await validateBranchInput(cwd, inputBox.value);
        if (errMsg) {
            inputBox.validationMessage = errMsg;
            return;
        }
        resolve(inputBox.value);
        inputBox.hide();
    });
    inputBox.onDidHide(() => {
        resolve(false);
    });
    inputBox.onDidChangeValue(debounce(async (value) => {
        const errMsg = await validateBranchInput(cwd, value);
        inputBox.validationMessage = errMsg;
    }, 300));
    inputBox.show();
    return promise;
};
