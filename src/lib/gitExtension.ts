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
        const onDidChange = throttle(updateTreeDataEvent.fire, 100, throttleOptions);
        const onDidChangeState = throttle(
            (e) => {
                console.log('[builtin git event]: ', e);
                events.forEach((event) => event.dispose());
                events.length = 0;
                builtinGit.repositories.forEach((repo) => {
                    events.push(repo.state.onDidChange(onDidChange));
                });
            },
            100,
            throttleOptions,
        );
        context.subscriptions.push(builtinGit.onDidChangeState(onDidChangeState));
    }
};
