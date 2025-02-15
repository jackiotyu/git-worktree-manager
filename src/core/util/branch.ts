import * as vscode from 'vscode';
import { checkBranchNameValid } from '@/core/git/checkBranchNameValid';

export const validateBranchInput = async (cwd: string, value: string) => {
    try {
        if (!value) return vscode.l10n.t('Branch name cannot be empty');
        const isValidBranchName = await checkBranchNameValid(cwd, value);
        if (!isValidBranchName) return vscode.l10n.t('Branch name is invalid');
        return '';
    } catch (error) {
        return String(error);
    }
};
