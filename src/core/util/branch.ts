import * as vscode from 'vscode';

/**
 * Sanitize branch name similar to VSCode behavior. Removes or replaces invalid characters according to Git branch naming rules.
 * @see https://github.com/microsoft/vscode/blob/1.107.1/extensions/git/src/commands.ts#L629
 */
export const sanitizeBranchName = (name: string, branchWhitespaceChar = '-') => {
    if (!name) return name;

    return name
        .trim()
        .replace(/^-+/, '')
        .replace(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$|\[|\]$/g, branchWhitespaceChar);
};

export const validateBranchName = (
    name: string,
): { sanitizedName?: string; validationMessage?: vscode.InputBoxValidationMessage } => {
    const config = vscode.workspace.getConfiguration('git');
    const branchWhitespaceChar = config.get<string>('branchWhitespaceChar')!;
    const branchValidationRegex = config.get<string>('branchValidationRegex')!;
    const validateName = new RegExp(branchValidationRegex);
    const sanitizedName = sanitizeBranchName(name, branchWhitespaceChar);

    if (validateName.test(sanitizedName)) {
        if (name === sanitizedName) {
            return { sanitizedName };
        }
        return {
            sanitizedName,
            validationMessage: {
                message: vscode.l10n.t('The new branch will be "{0}"', sanitizedName),
                severity: vscode.InputBoxValidationSeverity.Info,
            },
        };
    }

    return {
        sanitizedName,
        validationMessage: {
            message: vscode.l10n.t('Branch name needs to match regex: {0}', branchValidationRegex),
            severity: vscode.InputBoxValidationSeverity.Error,
        },
    };
};
