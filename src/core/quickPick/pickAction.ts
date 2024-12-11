import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder } from '@/core/util/folder';
import { IWorktreeLess, QuickPickAction } from '@/types';
import { Commands } from '@/constants';
import { Alert } from '@/core/ui/message';
import { Config } from '@/core/config/setting';
import path from 'path';
import { backButton } from './quickPick.button';

const getPickActionsByWorktree = async (viewItem: IWorktreeLess) => {
    const [commitDetail] = await Promise.all([getLashCommitDetail(viewItem.path, ['s', 'H'])]);
    const template = Config.get('worktreePick.copyTemplate', '$LABEL');
    const isCurrent = judgeIncludeFolder(viewItem.path);
    const items: QuickPickAction[] = [
        {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('template content')),
            description: template
                .replace(/\$HASH/g, commitDetail.H || '')
                .replace(/\$MESSAGE/g, commitDetail.s || '')
                .replace(/\$FULL_PATH/g, viewItem.path)
                .replace(/\$BASE_NAME/g, path.basename(viewItem.path))
                .replace(/\$LABEL/g, viewItem.name),
            action: 'copy',
        },
        {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('ref name')),
            description: viewItem.name,
            action: 'copy',
        },
        {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('commit hash')),
            description: commitDetail.H || '',
            action: 'copy',
        },
        {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('commit message')),
            description: commitDetail.s || '',
            action: 'copy',
        },
        {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t('folder path')),
            description: viewItem.path,
            action: 'copy',
        },
        {
            iconPath: new vscode.ThemeIcon('history'),
            label: vscode.l10n.t('View git history'),
            action: Commands.viewHistory,
        },
        {
            iconPath: new vscode.ThemeIcon('terminal-bash'),
            label: vscode.l10n.t('Open in External Terminal'),
            action: Commands.openExternalTerminalContext,
        },
        {
            iconPath: new vscode.ThemeIcon('terminal'),
            label: vscode.l10n.t('Open in Built-in Terminal'),
            action: Commands.openTerminal,
        },
        {
            iconPath: new vscode.ThemeIcon('multiple-windows'),
            label: vscode.l10n.t('Add folder to workspace'),
            action: Commands.addToWorkspace,
            hide: isCurrent,
        },
        {
            iconPath: new vscode.ThemeIcon('close'),
            label: vscode.l10n.t('Remove folder from workspace'),
            action: Commands.removeFromWorkspace,
            hide: !isCurrent,
        },
        {
            iconPath: new vscode.ThemeIcon('folder-opened'),
            label: vscode.l10n.t('Reveal in the system explorer'),
            action: Commands.revealInSystemExplorerContext,
        },
        {
            iconPath: new vscode.ThemeIcon('repo'),
            label: vscode.l10n.t('Open the repository in Source Control view'),
            action: Commands.openRepository,
        },
    ];
    return items.filter((i) => !i.hide);
};

interface HandlerArgs {
    resolve: Function;
    reject: Function;
    quickPick: vscode.QuickPick<QuickPickAction>;
}

async function handleAccept({
    quickPick,
    resolve,
    reject,
    viewItem,
}: HandlerArgs & {
    viewItem: IWorktreeLess;
}) {
    const item = quickPick.selectedItems[0];
    if (!item) {
        resolve();
        quickPick.hide();
        return;
    }
    switch (item.action) {
        case 'copy':
            const detail = item.description || '';
            await vscode.env.clipboard.writeText(detail).then(() => {
                Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', detail));
            });
            break;
        case Commands.openExternalTerminalContext:
        case Commands.openTerminal:
        case Commands.revealInSystemExplorerContext:
        case Commands.viewHistory:
        case Commands.openRepository:
            await vscode.commands.executeCommand(item.action, viewItem);
            break;
        case Commands.removeFromWorkspace:
        case Commands.addToWorkspace:
            reject();
            quickPick.hide();
            process.nextTick(() => {
                vscode.commands.executeCommand(item.action, viewItem);
            });
            return;
        default:
            const value: never = item.action;
            void value;
            break;
    }
    resolve(item);
    quickPick.hide();
}

function handleTriggerButton({
    event,
    resolve,
    reject,
    quickPick,
}: HandlerArgs & {
    event: vscode.QuickInputButton;
}) {
    if (event === backButton) {
        resolve();
        quickPick.hide();
        return;
    }
}

function handleHide({
    disposables,
    resolve,
    reject,
    quickPick,
}: HandlerArgs & {
    disposables: vscode.Disposable[];
}) {
    reject();
    disposables.forEach((i) => i.dispose());
    disposables.length = 0;
    quickPick.dispose();
}

function buildTitle(viewItem: IWorktreeLess) {
    return `${viewItem.name} ⇄ ${viewItem.path.length > 35 ? `...${viewItem.path.slice(-34)}` : viewItem.path}`;
}

export const pickAction = async (viewItem: IWorktreeLess) => {
    const disposables: vscode.Disposable[] = [];
    let resolve: (value: QuickPickAction | void | false) => void = () => {};
    let reject: (value?: any) => void = () => {};
    let waiting = new Promise<QuickPickAction | void | false>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    try {
        const quickPick = vscode.window.createQuickPick<QuickPickAction>();
        quickPick.title = buildTitle(viewItem);
        quickPick.placeholder = vscode.l10n.t('Please select an action');
        quickPick.buttons = [backButton];
        quickPick.busy = true;
        disposables.push(
            quickPick.onDidHide(() => handleHide({ disposables, resolve, reject, quickPick })),
            quickPick.onDidAccept(() => handleAccept({ quickPick, resolve, reject, viewItem })),
            quickPick.onDidTriggerButton((event) => handleTriggerButton({ event, resolve, reject, quickPick })),
        );
        quickPick.show();
        await new Promise((r) => process.nextTick(r));
        quickPick.items = await getPickActionsByWorktree(viewItem);
        quickPick.busy = false;
        return waiting;
    } catch {
        reject();
    }
};
