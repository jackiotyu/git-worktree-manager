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

interface WorktreeInfo {
    name: string;
    fsPath: string;
}

/** 获取当前工作目录信息 */
async function getCurrentWorkingDirectory(): Promise<WorktreeInfo | false> {
    const isValidGit = await checkGitValid();
    if (!isValidGit) {
        Alert.showErrorMessage(vscode.l10n.t('The folder is not a valid Git repository'));
        return false;
    }

    const fsPath = folderRoot.uri?.fsPath || '';
    const name = (await getNameRev(fsPath))
        .replace(/^tags\//, '')
        .replace(/^heads\//, '')
        .trim();

    return { fsPath, name };
}

/** 构建标题 */
function buildTitle(info: WorktreeInfo): string {
    const maxPathLength = 35;
    const truncatedPath = info.fsPath.length > maxPathLength ? `...${info.fsPath.slice(-34)}` : info.fsPath;

    return `${info.name} ⇄ ${truncatedPath}`;
}

/** 执行分支切换操作 */
async function performCheckout(info: WorktreeInfo, refName: string, isBranch: boolean): Promise<void> {
    const progressMessage = vscode.l10n.t('Checkout branch ( {0} ) on {1}', refName, info.fsPath);

    actionProgressWrapper(
        progressMessage,
        () => checkoutBranch(info.fsPath, refName, isBranch),
        () => {} // 成功回调为空
    );
}

/** 切换分支命令 */
export const checkoutBranchCmd = async (item?: IWorktreeLess): Promise<boolean | void> => {
    // 获取工作目录信息
    let worktreeInfo: WorktreeInfo | false = item
        ? { name: item.name, fsPath: item.fsPath }
        : await getCurrentWorkingDirectory();

    if (!worktreeInfo) return false;

    // 获取主文件夹
    const mainFolder = await getMainFolder(worktreeInfo.fsPath);
    if (!mainFolder) return false;

    // 构建标题并选择分支
    const title = buildTitle(worktreeInfo);
    const branchItem = await pickBranch({
        title: vscode.l10n.t('Checkout branch ( {0} )', title),
        placeholder: vscode.l10n.t('Select branch to checkout'),
        mainFolder,
        cwd: worktreeInfo.fsPath,
        showCreate: true,
    });

    // 处理选择结果
    if (branchItem === void 0) return;
    if (!branchItem) return false;

    // 执行切换操作
    const refName = branchItem.branch || branchItem.hash || '';
    const isBranch = !!branchItem.branch;

    performCheckout(worktreeInfo, refName, isBranch);
};
