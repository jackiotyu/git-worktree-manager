import * as vscode from 'vscode';
import { getLashCommitDetail } from '@/core/git/getLashCommitDetail';
import { judgeIncludeFolder } from '@/core/util/folder';
import { IWorktreeLess, QuickPickAction } from '@/types';
import { Commands } from '@/constants';
import { Alert } from '@/core/ui/message';
import { Config } from '@/core/config/setting';
import path from 'path';
import { backButton } from './quickPick.button';
import { withResolvers } from '@/core/util/promise';

// 定义接口，使参数结构更清晰
interface CopyActionParams {
    label: string;
    description: string;
}

interface CommandActionParams {
    icon: string;
    label: string;
    action: QuickPickAction['action'];
    hide?: boolean;
}

interface TemplateVars {
    hash: string;
    message: string;
    fullPath: string;
    baseName: string;
    label: string;
}

interface AcceptHandlerParams {
    quickPick: vscode.QuickPick<QuickPickAction>;
    resolve: Function;
    reject: Function;
    viewItem: IWorktreeLess;
}

class WorktreeActionPicker {
    private static readonly templateVars = {
        hash: '$HASH',
        message: '$MESSAGE',
        fullPath: '$FULL_PATH',
        baseName: '$BASE_NAME',
        label: '$LABEL',
    };

    private static buildCopyAction({ label, description }: CopyActionParams): QuickPickAction {
        return {
            iconPath: new vscode.ThemeIcon('copy'),
            label: vscode.l10n.t('Copy • {0}', vscode.l10n.t(label)),
            description,
            action: 'copy',
        };
    }

    private static buildCommandAction({ icon, label, action, hide }: CommandActionParams): QuickPickAction {
        return {
            iconPath: new vscode.ThemeIcon(icon),
            label: vscode.l10n.t(label),
            action,
            hide,
        };
    }

    private static async getPickActionsByWorktree(viewItem: IWorktreeLess): Promise<QuickPickAction[]> {
        const [commitDetail] = await Promise.all([getLashCommitDetail(viewItem.fsPath, ['s', 'H'])]);
        const template = Config.get('worktreePick.copyTemplate', '$LABEL');
        const isCurrent = judgeIncludeFolder(viewItem.fsPath);

        const templateVars: TemplateVars = {
            hash: commitDetail.H || '',
            message: commitDetail.s || '',
            fullPath: viewItem.fsPath,
            baseName: path.basename(viewItem.fsPath),
            label: viewItem.name,
        };

        const copyActions: QuickPickAction[] = [
            this.buildCopyAction({
                label: 'template content',
                description: this.replaceTemplateVars(template, templateVars),
            }),
            this.buildCopyAction({ label: 'reference name', description: viewItem.name }),
            this.buildCopyAction({ label: 'commit hash', description: templateVars.hash }),
            this.buildCopyAction({ label: 'commit message', description: templateVars.message }),
            this.buildCopyAction({ label: 'folder path', description: viewItem.fsPath }),
        ];

        const commandActions: QuickPickAction[] = [
            this.buildCommandAction({ icon: 'history', label: 'View Git history', action: Commands.viewHistory }),
            this.buildCommandAction({
                icon: 'terminal-bash',
                label: 'Open in External Terminal',
                action: Commands.openExternalTerminalContext,
            }),
            this.buildCommandAction({
                icon: 'terminal',
                label: 'Open in Built-in Terminal',
                action: Commands.openTerminal,
            }),
            this.buildCommandAction({
                icon: 'multiple-windows',
                label: 'Add Folder to Workspace',
                action: Commands.addToWorkspace,
                hide: isCurrent,
            }),
            this.buildCommandAction({
                icon: 'close',
                label: 'Remove Folder from Workspace',
                action: Commands.removeFromWorkspace,
                hide: !isCurrent,
            }),
            this.buildCommandAction({
                icon: 'folder-opened',
                label: 'Reveal in System Explorer',
                action: Commands.revealInSystemExplorerContext,
            }),
            this.buildCommandAction({
                icon: 'repo',
                label: 'Open the repository in Source Control view',
                action: Commands.openRepository,
            }),
            this.buildCommandAction({
                icon: 'trash',
                label: 'Remove Worktree',
                action: Commands.removeWorktree,
            }),
        ];

        return [...copyActions, ...commandActions].filter((i) => !i.hide);
    }

    private static replaceTemplateVars(template: string, vars: TemplateVars): string {
        return template
            .replace(new RegExp(this.templateVars.hash, 'g'), vars.hash)
            .replace(new RegExp(this.templateVars.message, 'g'), vars.message)
            .replace(new RegExp(this.templateVars.fullPath, 'g'), vars.fullPath)
            .replace(new RegExp(this.templateVars.baseName, 'g'), vars.baseName)
            .replace(new RegExp(this.templateVars.label, 'g'), vars.label);
    }

    private static async handleCopyAction(detail: string): Promise<void> {
        await vscode.env.clipboard.writeText(detail);
        Alert.showInformationMessage(vscode.l10n.t('Copied successfully: {0}', detail));
    }

    private static async handleCommandAction(action: string, viewItem: IWorktreeLess): Promise<void> {
        await vscode.commands.executeCommand(action, viewItem);
    }

    private static handleWorkspaceAction(action: string, viewItem: IWorktreeLess): void {
        process.nextTick(() => {
            vscode.commands.executeCommand(action, viewItem);
        });
    }

    private static async handleAccept({ quickPick, resolve, reject, viewItem }: AcceptHandlerParams): Promise<void> {
        const item = quickPick.selectedItems[0];
        if (!item) {
            resolve();
            quickPick.hide();
            return;
        }

        try {
            switch (item.action) {
                case 'copy':
                    await this.handleCopyAction(item.description || '');
                    break;
                case Commands.openExternalTerminalContext:
                case Commands.openTerminal:
                case Commands.revealInSystemExplorerContext:
                case Commands.viewHistory:
                case Commands.openRepository:
                case Commands.removeWorktree:
                    await this.handleCommandAction(item.action, viewItem);
                    break;
                case Commands.removeFromWorkspace:
                case Commands.addToWorkspace:
                    reject();
                    quickPick.hide();
                    this.handleWorkspaceAction(item.action, viewItem);
                    return;
                default:
                    const value: never = item.action;
                    void value;
                    break;
            }
            resolve(item);
            quickPick.hide();
        } catch (error) {
            reject(error);
            Alert.showErrorMessage(`${error}`);
        }
    }

    private static buildTitle(viewItem: IWorktreeLess): string {
        const maxPathLength = 35;
        const path = viewItem.fsPath;
        const truncatedPath = path.length > maxPathLength ? `...${path.slice(-maxPathLength + 1)}` : path;
        return `${viewItem.name} ⇄ ${truncatedPath}`;
    }

    public static pick = async (viewItem: IWorktreeLess): Promise<QuickPickAction | void | false> => {
        const disposables: vscode.Disposable[] = [];
        const { resolve, reject, promise } = withResolvers<QuickPickAction | void | false>();

        try {
            const quickPick = vscode.window.createQuickPick<QuickPickAction>();
            quickPick.title = this.buildTitle(viewItem);
            quickPick.placeholder = vscode.l10n.t('Please select an action');
            quickPick.buttons = [backButton];
            quickPick.busy = true;

            disposables.push(
                quickPick.onDidHide(() => {
                    reject();
                    disposables.forEach((d) => d.dispose());
                    disposables.length = 0;
                    quickPick.dispose();
                }),
                quickPick.onDidAccept(() => this.handleAccept({ quickPick, resolve, reject, viewItem })),
                quickPick.onDidTriggerButton((event) => {
                    if (event === backButton) {
                        resolve();
                        quickPick.hide();
                    }
                }),
            );

            quickPick.show();
            await new Promise((r) => process.nextTick(r));
            quickPick.items = await this.getPickActionsByWorktree(viewItem);
            quickPick.busy = false;

            return promise;
        } catch (error) {
            reject(error);
            return false;
        }
    };
}

export const pickAction = WorktreeActionPicker.pick;
