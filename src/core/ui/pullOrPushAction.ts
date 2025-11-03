import { pullBranch } from '@/core/git/pullBranch';
import { pushBranch } from '@/core/git/pushBranch';
import { PullPushArgs } from '@/types';

export const pullOrPushAction = async (action: 'pull' | 'push', options: PullPushArgs) => {
    return action === 'pull' ? pullBranch(options) : pushBranch(options);
};
