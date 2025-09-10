/**
 * Configuration Management Module
 * Manages all configuration items for the Git Worktree Manager extension
 * Provides unified configuration access, update, and monitoring functionality
 */
import * as vscode from 'vscode';
import { APP_NAME, AlertLevel } from '@/constants';
import { DefaultDisplayList, GitHistoryExtension } from '@/types';

/**
 * Configuration Management Class
 * Encapsulates VSCode configuration system operations and provides type-safe configuration access
 */
export class Config {
    private constructor() {}

    /** Array of disposable objects for storing configuration change listeners */
    static disposables: vscode.Disposable[] = [];

    /**
     * IMPORTANT: The defaultValue parameter in each get() method must match
     * the corresponding default value defined in package.json configuration.
     * This ensures consistency between code defaults and extension settings.
     */

    // Basic configuration items
    static get(key: 'alertLevel', defaultValue: 'error'): AlertLevel;
    static get(key: 'gitHistoryExtension', defaultValue: GitHistoryExtension.gitGraph): GitHistoryExtension;

    // Worktree picker configuration
    static get(key: 'worktreePick.defaultDisplayList', defaultValue: DefaultDisplayList.workspace): DefaultDisplayList;
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
    static get(key: 'worktreePick.showRemoveWorktree', defaultValue: true): boolean;

    // Branch picker configuration
    static get(key: 'branchPick.showDeleteBranch', defaultValue: true): boolean;

    // Terminal configuration
    static get(key: 'terminalCmdList', defaultValue: []): string[];
    static get(key: 'terminalLocationInEditor', defaultValue: false): boolean;
    static get(key: 'terminalNameTemplate', defaultValue: '$LABEL ⇄ $FULL_PATH'): string;

    // Workspace configuration
    static get(key: 'openInsideFolder', defaultValue: false): boolean;
    static get(key: 'httpProxy', defaultValue: ''): string;
    static get(key: 'workspacePathFormat', defaultValue: '$BASE_NAME - $FULL_PATH'): string;

    // Worktree operation configuration
    static get(key: 'promptDeleteBranchAfterWorktreeDeletion', defaultValue: false): boolean;
    static get(key: 'worktreeCopyPatterns', defaultValue: []): string[];
    static get(key: 'worktreeCopyIgnores', defaultValue: []): string[];
    static get(key: 'checkoutIgnoreOtherWorktree', defaultValue: false): boolean;

    // Tree view configuration
    static get(key: 'treeView.showFetchInTreeItem', defaultValue: true): boolean;
    static get(key: 'treeView.toSCM', defaultValue: false): boolean;
    static get(key: 'treeView.worktreeDescriptionTemplate', defaultValue: '$FULL_PATH'): string;

    // Path template configuration
    static get(key: 'worktreePathTemplate', defaultValue: '$BASE_PATH.worktree'): string;
    static get(key: 'worktreeSubdirectoryTemplate', defaultValue: 'worktree$INDEX'): string;

    // Post-creation command configuration
    static get(key: 'postCreateCmd', defaultValue: ''): string;
    /**
     * Get configuration value
     * @param key Configuration key name
     * @param defaultValue Default value
     * @returns Configuration value or default value
     */
    static get<T>(key: string, defaultValue: T): T {
        return vscode.workspace.getConfiguration(APP_NAME).get(key, defaultValue);
    }

    /**
     * Update configuration value
     * @param key Configuration key name
     * @param defaultValue New configuration value
     * @returns Promise<void>
     */
    static update<T>(key: string, defaultValue: T): Thenable<void> {
        return vscode.workspace.getConfiguration(APP_NAME).update(key, defaultValue);
    }

    /**
     * Listen for configuration changes
     * @param key Configuration key name
     * @param func Callback function when configuration changes
     * @returns Disposable event listener
     */
    static onChange(key: string, func: () => any) {
        const event = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(`${APP_NAME}.${key}`)) func();
        });
        this.disposables.push(event);
        return event;
    }

    /**
     * Dispose all configuration listeners
     * Called when extension is deactivated to clean up resources
     */
    static dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables.length = 0;
    }
}
