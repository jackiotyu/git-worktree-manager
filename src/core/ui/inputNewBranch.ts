import * as vscode from 'vscode';
import { withResolvers } from '@/core/util/promise';
import { validateBranchName } from '@/core/util/branch';

const backButton = vscode.QuickInputButtons.Back;

export const inputNewBranch = async (cwd: string, defaultValue?: string) => {
    const { promise, resolve, reject } = withResolvers<string | undefined | false>();
    const inputBox = vscode.window.createInputBox();
    inputBox.ignoreFocusOut = true;
    inputBox.value = defaultValue || vscode.workspace.getConfiguration('git').get('branchPrefix', '');
    inputBox.valueSelection = [-1, -1];
    inputBox.placeholder = vscode.l10n.t('Please enter branch name');
    inputBox.prompt = vscode.l10n.t('Please enter branch name');
    inputBox.buttons = [backButton];
    inputBox.onDidTriggerButton((event) => {
        if (event === backButton) {
            resolve(undefined);
            inputBox.dispose();
        }
    });
    inputBox.onDidAccept(() => {
        const { sanitizedName, validationMessage } = validateBranchName(inputBox.value);
        if (validationMessage && validationMessage.severity > vscode.InputBoxValidationSeverity.Info) {
            inputBox.validationMessage = validationMessage;
            return;
        }
        resolve(sanitizedName);
        inputBox.hide();
    });
    inputBox.onDidHide(() => {
        resolve(false);
    });
    inputBox.onDidChangeValue((value) => {
        const { validationMessage } = validateBranchName(value);
        inputBox.validationMessage = validationMessage;
    });
    inputBox.show();
    return promise;
};
