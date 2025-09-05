import { extensions, commands, Uri, MarkdownString, l10n } from 'vscode';
import { Alert } from '@/core/ui/message';
import { Config } from '@/core/config/setting';
import { GitHistoryExtension } from '@/types';

export class GitHistory {
    static get extensionName() {
        return Config.get('gitHistoryExtension', GitHistoryExtension.gitGraph);
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
            const tips = l10n.t('Please install the extension, click to search for {0}', `📦 [${this.extensionName}](${commandUri})`);
            const contents = new MarkdownString(tips, true);
            throw Error(contents.value);
        }
        if (!extension.isActive) {
            extension.activate();
        }
    }
    private static async openHistoryStrategy(uri: Uri) {
        switch (this.extensionName) {
            case GitHistoryExtension.gitGraph:
                return commands.executeCommand('git-graph.view', { rootUri: uri });
            case GitHistoryExtension.builtinGit:
                await commands.executeCommand('git.openRepository', uri.fsPath);
                await commands.executeCommand('workbench.scm.history.focus');
                return commands.executeCommand('workbench.scm.action.graph.pickRepository');
        }
    }
}
