import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { GitApi } from '../../core/git/scmGit';

const extensionHolder: { current?: GitExtensionDouble } = {};
// Git 环境变量名由 VS Code Git 扩展约定，不能改成驼峰
const gitEnv = {
    /* eslint-disable-next-line @typescript-eslint/naming-convention */
    GIT_ASKPASS: '/askpass.js',
};

interface GitExtensionDouble {
    isActive: boolean;
    exports: { getAPI: (version: 1) => { git: { path: string; env: Record<string, string> } } };
    activate: ReturnType<typeof rs.fn>;
}

rs.mock('vscode', () => ({
    window: {
        createOutputChannel: () => ({
            appendLine: () => {},
            append: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {},
            error: () => {},
            info: () => {},
            trace: () => {},
            warn: () => {},
        }),
    },
    extensions: {
        getExtension: () => extensionHolder.current,
    },
}));

function createExtension(): GitExtensionDouble {
    const api = {
        git: {
            path: '/usr/bin/git',
            env: gitEnv,
        },
    };
    const extension: GitExtensionDouble = {
        isActive: false,
        exports: { getAPI: () => api },
        activate: rs.fn(async () => {
            extension.isActive = true;
            return extension.exports;
        }),
    };
    return extension;
}

describe('GitApi.getAPI', () => {
    beforeEach(() => {
        extensionHolder.current = createExtension();
    });

    it('waits for vscode.git activation and keeps its path and env', async () => {
        const extension = extensionHolder.current!;
        let resolveActivate: (value: GitExtensionDouble['exports']) => void = () => {};
        extension.activate.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveActivate = resolve;
                }),
        );

        const gitApi = new GitApi();
        const first = gitApi.getAPI();
        const second = gitApi.getAPI();
        expect(extension.activate).toHaveBeenCalledTimes(1);

        resolveActivate(extension.exports);
        const [api1, api2] = await Promise.all([first, second]);

        expect(api1).toBe(extension.exports.getAPI(1));
        expect(api2).toBe(api1);
        expect(gitApi.gitPath).toBe('/usr/bin/git');
        expect(gitApi.gitEnv).toEqual(gitEnv);
    });

    it('retries activation after a failure instead of keeping an empty env', async () => {
        const extension = extensionHolder.current!;
        extension.activate.mockRejectedValueOnce(new Error('activate failed'));

        const gitApi = new GitApi();
        await expect(gitApi.getAPI()).resolves.toBeUndefined();
        expect(gitApi.gitPath).toBe('git');
        expect(gitApi.gitEnv).toEqual({});

        const api = await gitApi.getAPI();
        expect(extension.activate).toHaveBeenCalledTimes(2);
        expect(api).toBe(extension.exports.getAPI(1));
        expect(gitApi.gitPath).toBe('/usr/bin/git');
        expect(gitApi.gitEnv).toEqual(gitEnv);
    });

    it('reads an already active extension without activating again', async () => {
        const extension = extensionHolder.current!;
        extension.isActive = true;

        const gitApi = new GitApi();
        const api = await gitApi.getAPI();

        expect(extension.activate).not.toHaveBeenCalled();
        expect(api).toBe(extension.exports.getAPI(1));
        expect(gitApi.gitPath).toBe('/usr/bin/git');
    });
});
