import * as vscode from 'vscode';
import { getMergedWorktreeCandidates, IMergedWorktreeCandidate } from '@/core/git/getMergedWorktreeCandidates';
import { withResolvers } from '@/core/util/promise';

interface IMergedWorktreePick extends vscode.QuickPickItem {
    fsPath: string;
    branch: string;
    isMerged: boolean;
    isMain: boolean;
    uriPath: string;
}

const createQuickPickItem = (candidate: IMergedWorktreeCandidate): IMergedWorktreePick => ({
    label: candidate.branch || vscode.l10n.t('Detached worktree'),
    detail: candidate.fsPath,
    description: candidate.isMerged ? vscode.l10n.t('Merged') : vscode.l10n.t('Not merged'),
    fsPath: candidate.fsPath,
    branch: candidate.branch,
    isMerged: candidate.isMerged,
    isMain: candidate.isMain,
    uriPath: candidate.uriPath,
    alwaysShow: true,
});

const selectAllMergedButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('check-all'),
    tooltip: vscode.l10n.t('Select all merged worktrees'),
};

export const pickMergedWorktree = async (
    repoPath: string,
    preselectMerged: boolean,
): Promise<IMergedWorktreeCandidate[] | void> => {
    const { resolve, reject, promise } = withResolvers<IMergedWorktreeCandidate[] | void>();
    let candidates: IMergedWorktreeCandidate[] = [];
    let isDisposed = false;

    const quickPick = vscode.window.createQuickPick<IMergedWorktreePick>();
    quickPick.title = vscode.l10n.t('Select worktrees to remove');
    quickPick.canSelectMany = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.buttons = [selectAllMergedButton];
    quickPick.items = [];
    quickPick.busy = true;

    const handleAccept = () => {
        if (quickPick.busy) return;
        const selectedPaths = new Set(quickPick.selectedItems.map((item) => item.fsPath));
        resolve(candidates.filter((candidate) => selectedPaths.has(candidate.fsPath)));
        quickPick.hide();
    };

    const handleHide = () => {
        isDisposed = true;
        resolve();
        quickPick.dispose();
    };

    const handleSelectAllMerged = (event: vscode.QuickInputButton) => {
        if (quickPick.busy || event !== selectAllMergedButton) return;
        quickPick.selectedItems = quickPick.items.filter(
            (item): item is IMergedWorktreePick => 'isMerged' in item && item.isMerged,
        );
    };

    quickPick.onDidAccept(handleAccept);
    quickPick.onDidHide(handleHide);
    quickPick.onDidTriggerButton(handleSelectAllMerged);
    quickPick.show();

    void (async () => {
        try {
            candidates = await getMergedWorktreeCandidates(repoPath);
            if (isDisposed) return;

            const items = candidates.map(createQuickPickItem).filter((item) => !item.isMain);
            quickPick.items = items;
            quickPick.selectedItems = preselectMerged ? items.filter((item) => item.isMerged) : [];
        } catch (error) {
            if (!isDisposed) {
                reject(error);
                quickPick.hide();
            }
        } finally {
            if (!isDisposed) quickPick.busy = false;
        }
    })();

    return promise;
};
