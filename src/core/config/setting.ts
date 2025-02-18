import * as vscode from 'vscode';
import { APP_NAME, AlertLevel } from '@/constants';
import { DefaultDisplayList, GitHistoryExtension } from '@/types';

export class Config {
    private constructor() {}

    static disposables: vscode.Disposable[] = [];

    static get(key: 'alertLevel', defaultValue: 'error'): AlertLevel;
    static get(key: 'gitHistoryExtension', defaultValue: GitHistoryExtension.gitGraph): GitHistoryExtension;
    static get(key: 'worktreePick.defaultDisplayList', defaultValue: DefaultDisplayList.all): DefaultDisplayList;
    static get(key: 'worktreePick.showViewHistory', defaultValue: true): boolean;
    static get(key: 'worktreePick.showCheckout', defaultValue: true): boolean;
    static get(key: 'worktreePick.showAddToWorkspace', defaultValue: false): boolean;
    static get(key: 'worktreePick.showCopy', defaultValue: false): boolean;
    static get(key: 'worktreePick.showRevealInSystemExplorer', defaultValue: false): boolean;
    static get(key: 'worktreePick.showTerminal', defaultValue: false): boolean;
    static get(key: 'worktreePick.showExternalTerminal', defaultValue: false): boolean;
    static get(key: 'worktreePick.copyTemplate', defaultValue: '$LABEL'): string;
    static get(key: 'worktreePick.pinCurrentRepo', defaultValue: false): boolean;
    static get(key: 'worktreePick.showOpenRepository', defaultValue: true): boolean;
    static get(key: 'worktreePick.showDeleteWorktree', defaultValue: true): boolean;
    static get(key: 'branchPick.showDeleteBranch', defaultValue: true): boolean;
    static get(key: 'terminalCmdList', defaultValue: []): string[];
    static get(key: 'terminalLocationInEditor', defaultValue: false): boolean;
    static get(key: 'openInsideFolder', defaultValue: false): boolean;
    static get(key: 'httpProxy', defaultValue: ''): string;
    static get(key: 'workspacePathFormat', defaultValue: '$BASE_NAME - $FULL_PATH'): string;
    static get<T>(key: string, defaultValue: T): T {
        return vscode.workspace.getConfiguration(APP_NAME).get(key, defaultValue);
    }

    static update<T>(key: string, defaultValue: T): Thenable<void> {
        return vscode.workspace.getConfiguration(APP_NAME).update(key, defaultValue);
    }

    static onChange(key: string, func: () => any) {
        const event = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(`${APP_NAME}.${key}`)) func();
        });
        this.disposables.push(event);
        return event;
    }

    static dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables.length = 0;
    }
}
