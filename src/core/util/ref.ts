export const parseUpstream = (upstream: string) => {
    const [remote, ...rest] = upstream.split('/');
    const branch = rest.join('/');
    return {
        remote,
        branch,
    };
};
