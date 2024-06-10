import * as vscode from "vscode";
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';
import folderRoot from "@/core/folderRoot";
import { checkGitValid } from '@/core/git/checkGitValid';
import { getNameRev } from '@/core/git/getNameRev';
import { checkoutBranch } from '@/core/git/checkoutBranch';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { actionProgressWrapper } from '@/core/ui/progress';

export const checkoutBranchCmd = async (item?: IWorktreeLess) => {
    let selectedItem: { name: string; path: string } | undefined = item;
    if (!item) {
        let isValidGit = await checkGitValid();
        if (!isValidGit) {
            Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
            return false;
        }
        selectedItem = {
            path: folderRoot.uri?.fsPath || '',
            name: (await getNameRev(folderRoot.uri?.fsPath || ''))
                .replace(/^tags\//, '')
                .replace(/^heads\//, '')
                .trim(),
        };
    }
    if (!selectedItem) return false;
    let branchItem = await pickBranch(
        vscode.l10n.t('Checkout branch ( {0} )', `${selectedItem.name} ⇄ ${selectedItem.path.length > 35 ? `...${selectedItem.path.slice(-34)}` : selectedItem.path}`),
        vscode.l10n.t('Select branch for checkout'),
        selectedItem.path,
    );
    // FIXME 改造quickPick
    if (branchItem === void 0) return;
    if (!branchItem) return false;
    const checkoutText = branchItem.branch || branchItem.hash || '';
    const isBranch = !!branchItem.branch;
    actionProgressWrapper(
        vscode.l10n.t('Checkout branch ( {0} ) on {1}', checkoutText, selectedItem.path),
        () => checkoutBranch(selectedItem!.path, checkoutText, isBranch),
        () => {},
    );
};