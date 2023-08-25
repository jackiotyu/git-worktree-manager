import * as vscode from 'vscode';
import { WorkTreeDataProvider } from './treeView';
import { API as GitAPI, GitExtension } from './git.d';
import throttle from 'lodash/throttle';
import type { ThrottleSettings } from 'lodash';

async function getBuiltInGitApi(): Promise<GitAPI | undefined> {
    try {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (extension) {
            const gitExtension = extension.isActive ? extension.exports : await extension.activate();
            return gitExtension.getAPI(1);
        }
    } catch {}
}

export const setupGitEvents = async (treeProvider: WorkTreeDataProvider) => {
    const builtinGit = await getBuiltInGitApi();
    if (builtinGit) {
        const throttleOptions: ThrottleSettings = { leading: true, trailing: true };
        builtinGit.onDidChangeState(
            throttle(
                (e) => {
                    console.log('[builtin git event]: ', e);
                    builtinGit.repositories.forEach((repo) => {
                        repo.state.onDidChange(
                            throttle(
                                () => {
                                    treeProvider.refresh();
                                },
                                100,
                                throttleOptions,
                            ),
                        );
                    });
                },
                100,
                throttleOptions,
            ),
        );
    }
};
