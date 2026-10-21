import 'vscode';

declare module 'vscode' {
    interface QuickPick<T extends QuickPickItem> {
        sortByLabel: boolean;
    }
}
