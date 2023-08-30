import { window, ExtensionContext, workspace } from 'vscode';
import { APP_NAME, AlertLevel } from '@/constants';

abstract class AlertRequire {
  static showErrorMessage: typeof window.showErrorMessage;
  static showInformationMessage: typeof window.showInformationMessage;
  static showWarningMessage: typeof window.showWarningMessage;
}

enum LevelNum {
    'info' = 1,
    'warn' = 2,
    'error' = 3,
}

export class Alert implements AlertRequire {
    static level: AlertLevel = 'info';
    static init(context: ExtensionContext) {
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(event => {
                if(event.affectsConfiguration(APP_NAME)) {
                    this.updateLevel();
                }
            })
        );
        this.updateLevel();
    }
    static updateLevel() {
        this.level = workspace.getConfiguration(APP_NAME).get<AlertLevel>('alertLevel') || 'info';
    }
    static get levelNum() {
        return LevelNum[this.level];
    }
    static showErrorMessage(...args: Parameters<typeof window.showErrorMessage>) {
        return window.showErrorMessage(...args);
    }
    static showInformationMessage(...args: Parameters<typeof window.showInformationMessage>) {
        if(this.levelNum > LevelNum.info) {return;};
        return window.showInformationMessage(...args);
    }
    static showWarningMessage(...args: Parameters<typeof window.showWarningMessage>) {
        if(this.levelNum > LevelNum.warn) {return;};
        return window.showWarningMessage(...args);
    }
}

export default Alert;

