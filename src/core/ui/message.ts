import { window, ExtensionContext, workspace } from 'vscode';
import { APP_NAME, AlertLevel } from '@/constants';
import { Config } from '@/core/config/setting';

enum LevelNum {
    'info' = 1,
    'warn' = 2,
    'error' = 3,
}

export class Alert {
    static level: AlertLevel = 'error';
    static init(context: ExtensionContext) {
        context.subscriptions.push(
            workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(APP_NAME)) {
                    this.updateLevel();
                }
            }),
        );
        this.updateLevel();
    }
    static updateLevel() {
        this.level = Config.get('alertLevel', 'error');
    }
    static get levelNum() {
        return LevelNum[this.level];
    }
    static showErrorMessage: typeof window.showErrorMessage = (message: any, options: any, ...items: any[]) => {
        return window.showErrorMessage(message, options, ...items);
    };
    static showInformationMessage: typeof window.showInformationMessage = (
        message: any,
        options: any,
        ...items: any[]
    ) => {
        if (this.levelNum > LevelNum.info) {
            return Promise.resolve();
        }
        return window.showInformationMessage(message, options, ...items);
    };
    static showWarningMessage: typeof window.showWarningMessage = (message: any, options: any, ...items: any[]) => {
        if (this.levelNum > LevelNum.warn) {
            return Promise.resolve();
        }
        return window.showWarningMessage(message, options, ...items);
    };
}
