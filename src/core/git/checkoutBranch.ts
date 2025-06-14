import { execAuto } from '@/core/git/exec';
import { getAllRefList } from '@/core/git/getAllRefList';
import { Config } from '@/core/config/setting';

const refArgs = ['refname', 'upstream:remoteref', 'refname:short', 'upstream:remotename'] as const;
type RefItem = Record<(typeof refArgs)[number], string>;

export const checkoutBranch = async (cwd: string, branchName: string, isBranch: boolean) => {
    const refList = await getAllRefList([...refArgs], cwd, ['--sort=-upstream']);

    const remoteBranchList = refList.filter((i) => /^refs\/remotes/.test(i.refname));
    const ignoreOtherWorktree = Config.get('checkoutIgnoreOtherWorktree', false);
    const isRemoteBranch = remoteBranchList.some((i) => i['refname:short'] === branchName);

    if (isRemoteBranch) {
        return handleRemoteBranch(refList, branchName, ignoreOtherWorktree, isBranch, cwd);
    }

    return handleLocalBranch(branchName, ignoreOtherWorktree, isBranch, cwd);
};

const findTrackingBranch = (refList: RefItem[], branchName: string): RefItem | undefined => {
    return refList.find((branch) => {
        if (!branch['upstream:remoteref']) return false;
        const remoteName = branch['upstream:remotename'];
        const refname = branch['refname:short'];
        return `${remoteName}/${refname}` === branchName;
    });
};

const handleRemoteBranch = async (
    refList: RefItem[],
    branchName: string,
    ignoreOtherWorktree: boolean,
    isBranch: boolean,
    cwd: string
) => {
    const trackingBranch = findTrackingBranch(refList, branchName);

    if (trackingBranch) {
        return execSwitchCommand({
            branchName: trackingBranch['refname:short'],
            ignoreOtherWorktree,
            isBranch,
            cwd,
        });
    }

    return execAuto(cwd, ['checkout', '-q', '--track', branchName]).then(r => r.stdout);
};

const handleLocalBranch = (branchName: string, ignoreOtherWorktree: boolean, isBranch: boolean, cwd: string) => {
    return execSwitchCommand({
        branchName,
        ignoreOtherWorktree,
        isBranch,
        cwd,
    });
};

interface SwitchCommandOptions {
    branchName: string;
    ignoreOtherWorktree: boolean;
    isBranch: boolean;
    cwd: string;
}

const execSwitchCommand = ({ branchName, ignoreOtherWorktree, isBranch, cwd }: SwitchCommandOptions) => {
    const args: string[] = ['switch'];
    if (ignoreOtherWorktree) {
        args.push('--ignore-other-worktrees');
    }
    if (!isBranch) {
        args.push('--detach');
    }
    args.push(branchName);
    return execAuto(cwd, args);
};
