import * as vscode from 'vscode';
import { API as GitAPI, GitExtension } from './git.d';
import throttle from 'lodash/throttle';
import type { ThrottleSettings } from 'lodash';
import { updateTreeDataEvent } from '@/lib/events';

async function getBuiltInGitApi(): Promise<GitAPI | undefined> {
    try {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (extension) {
            const gitExtension = extension.isActive ? extension.exports : await extension.activate();
            return gitExtension.getAPI(1);
        }
    } catch {}
}

// TODO 手动监听 git index 文件变动
export const setupGitEvents = async (context: vscode.ExtensionContext) => {
    const builtinGit = await getBuiltInGitApi();
    if (builtinGit) {
        const events: vscode.Disposable[] = [];
        context.subscriptions.push({
            dispose() {
                events.forEach((event) => event.dispose());
                events.length = 0;
            },
        });
        const throttleOptions: ThrottleSettings = { leading: true, trailing: true };
        const checkRepos = (e?: any) => {
            console.log('[builtin git event]: ', e);
            events.forEach((event) => event.dispose());
            events.length = 0;
            builtinGit.repositories.forEach((repo) => {
                events.push(repo.state.onDidChange(onDidChange));
            });
        };
        const onDidChange = throttle(
            () => {
                updateTreeDataEvent.fire();
            },
            30000,
            throttleOptions,
        );
        const onDidChangeState = throttle(checkRepos, 30000, throttleOptions);
        checkRepos();
        context.subscriptions.push(builtinGit.onDidChangeState(onDidChangeState));
    }
};
