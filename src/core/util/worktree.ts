import * as vscode from 'vscode';
import { AheadBehindInfo } from '@/types';
import { WORK_TREE_SCHEME } from '@/constants';

export const getWorktreeStatus = (item: AheadBehindInfo) => {
    if (item.ahead && item.behind) return 'diverged';
    if (item.ahead) return 'ahead';
    if (item.behind) return 'behind';
    return 'upToDate';
};

/**
 * Fork from https://github.com/gitkraken/vscode-gitlens/blob/main/src/views/viewDecorationProvider.ts#L149
 */
export class WorktreeDecorator implements vscode.FileDecorationProvider {
    provideFileDecoration(uri: vscode.Uri) {
        if (uri.scheme !== WORK_TREE_SCHEME) return undefined;
        const [, , status] = uri.path.split('/');

        switch (status) {
            case 'ahead':
                return {
                    badge: '▲',
                    color: new vscode.ThemeColor('charts.green'),
                    tooltip: 'Ahead',
                };
            case 'behind':
                return {
                    badge: '▼',
                    color: new vscode.ThemeColor('charts.orange'),
                    tooltip: 'Behind',
                };
            case 'diverged':
                return {
                    badge: '▼▲',
                    color: new vscode.ThemeColor('charts.yellow'),
                    tooltip: 'Diverged',
                };
            default:
                return undefined;
        }
    }
}
