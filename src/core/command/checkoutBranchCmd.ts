import * as vscode from 'vscode';
import { Alert } from '@/core/ui/message';
import { IWorktreeLess } from '@/types';
import folderRoot from '@/core/folderRoot';
import { checkGitValid } from '@/core/git/checkGitValid';
import { getMainFolder } from '@/core/git/getMainFolder';
import { getNameRev } from '@/core/git/getNameRev';
import { checkoutBranch } from '@/core/git/checkoutBranch';
import { pickBranch } from '@/core/quickPick/pickBranch';
import { actionProgressWrapper } from '@/core/ui/progress';

export const checkoutBranchCmd = async (item?: IWorktreeLess) => {
    let selected: { name: string; path: string } | undefined = item;
    if (!item) {
        let isValidGit = await checkGitValid();
        if (!isValidGit) {
            Alert.showErrorMessage(vscode.l10n.t('The folder is not a git repository available'));
            return false;
        }
        selected = {
            path: folderRoot.uri?.fsPath || '',
            name: (await getNameRev(folderRoot.uri?.fsPath || ''))
                .replace(/^tags\//, '')
                .replace(/^heads\//, '')
                .trim(),
        };
    }
    if (!selected) return false;
    const mainFolder = await getMainFolder(selected.path);
    if (!mainFolder) return false;
    const title = `${selected.name} ⇄ ${selected.path.length > 35 ? `...${selected.path.slice(-34)}` : selected.path}`;
    let branchItem = await pickBranch({
        title: vscode.l10n.t('Checkout branch ( {0} )', title),
        placeholder: vscode.l10n.t('Select branch for checkout'),
        mainFolder,
        cwd: selected.path,
        showCreate: true,
    });
    // FIXME 改造quickPick
    if (branchItem === void 0) return;
    if (!branchItem) return false;
    const checkoutText = branchItem.branch || branchItem.hash || '';
    const isBranch = !!branchItem.branch;
    actionProgressWrapper(
        vscode.l10n.t('Checkout branch ( {0} ) on {1}', checkoutText, selected.path),
        () => checkoutBranch(selected!.path, checkoutText, isBranch),
        () => {},
    );
};
