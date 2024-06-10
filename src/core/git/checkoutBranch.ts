import { execAuto } from '@/core/git/exec';
import { getAllRefList } from '@/core/git/getAllRefList';

export const checkoutBranch = async (cwd: string, branchName: string, isBranch: boolean) => {
    const refList = await getAllRefList(
        ['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'],
        cwd,
        ['--sort=-upstream'],
    );
    const remoteBranchList = refList.filter((i) => /^refs\/remotes/.test(i.refname));
    // 当前为远程分支名
    if (remoteBranchList.some((i) => i['refname:short'] === branchName)) {
        const trackingBranch = refList.find((branch) => {
            if (!branch['upstream:remoteref']) return false;
            const remoteName = branch['upstream:remotename'];
            const refname = branch['refname:short'];
            // 已有本地分支与远程分支关联
            return `${remoteName}/${refname}` === branchName;
        });
        // 判断是否已建立该分支
        if (trackingBranch) {
            // 需要使用本地分支名
            const localBranchName = trackingBranch['refname:short'];
            const list = [isBranch ? '' : '--detach', localBranchName].filter((i) => i);
            return execAuto(cwd, ['switch', '--ignore-other-worktrees', ...list]);
        } else {
            // FIXME 自动新建关联远程分支
            return execAuto(cwd, ['checkout', '-q', '--track', branchName]);
        }
    } else {
        const list = [isBranch ? '' : '--detach', branchName].filter((i) => i);
        return execAuto(cwd, ['switch', '--ignore-other-worktrees', ...list]);
    }
};