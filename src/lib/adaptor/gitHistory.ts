import { workspace, extensions, commands, Uri, MarkdownString } from 'vscode';
import { APP_NAME } from '@/constants';
import { Alert } from '@/lib/adaptor/window';
import localize from '@/localize';

export enum GitHistoryExtension {
    // gitHistory = 'donjayamanne.githistory',
    gitGraph = 'mhutchie.git-graph',
}

export class GitHistory {
    static get extensionName() {
        return (
            workspace.getConfiguration(APP_NAME).get<GitHistoryExtension>('gitHistoryExtension') ||
            GitHistoryExtension.gitGraph
        );
    }
    static openHistory(uri: Uri) {
        try {
            this.checkExtension();
            this.openHistoryStrategy(uri);
        } catch (error: any) {
            Alert.showErrorMessage(error.message);
        }
    }
    private static checkExtension() {
        const extension = extensions.getExtension(this.extensionName);
        if (!extension) {
            const args = encodeURIComponent(JSON.stringify([[this.extensionName]]));
            const commandUri = Uri.parse(`command:workbench.extensions.action.showExtensionsWithIds?${args}`);
            const tips = localize('msg.error.installExtension', `📦 [${this.extensionName}](${commandUri})`);
            const contents = new MarkdownString(tips, true);
            throw Error(contents.value);
        }
        if (!extension.isActive) {
            extension.activate();
        }
    }
    private static openHistoryStrategy(uri: Uri) {
        switch (this.extensionName) {
            case GitHistoryExtension.gitGraph:
                return commands.executeCommand('git-graph.view', { rootUri: uri });
        }
    }
}
