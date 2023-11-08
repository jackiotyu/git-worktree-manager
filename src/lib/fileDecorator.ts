import * as vscode from 'vscode';
import { WORK_TREE_SCHEME } from '@/constants';

export class WorkTreeDecorator implements vscode.FileDecorationProvider {
    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
        if(uri.scheme !== WORK_TREE_SCHEME) return undefined;
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