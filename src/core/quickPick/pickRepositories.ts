import * as vscode from 'vscode';
import { backButton } from '@/core/quickPick/quickPick.button';

export interface RepositoryQuickPickItem {
    name: string;
    relativePath: string;
    remote: string;
}

export async function pickRepositories(
    repos: RepositoryQuickPickItem[],
    options: { title: string; placeHolder: string; canSelectMany: boolean },
): Promise<RepositoryQuickPickItem[] | undefined> {
    const selected = await vscode.window.showQuickPick(
        repos.map((repo) => ({
            label: repo.name,
            description: repo.relativePath,
            detail: repo.remote,
            repo,
        })),
        {
            title: options.title,
            placeHolder: options.placeHolder,
            canPickMany: options.canSelectMany,
            ignoreFocusOut: true,
        },
    );
    return selected?.map((item) => item.repo);
}

async function pickRepositoriesWithBackButton(
    repos: RepositoryQuickPickItem[],
    options: { title: string; placeHolder: string; canSelectMany: boolean },
): Promise<RepositoryQuickPickItem[] | undefined> {
    return new Promise((resolve) => {
        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { repo: RepositoryQuickPickItem }>();
        let resolved = false;
        const finish = (selected?: RepositoryQuickPickItem[]) => {
            if (resolved) return;
            resolved = true;
            quickPick.hide();
            quickPick.dispose();
            resolve(selected);
        };

        quickPick.title = options.title;
        quickPick.placeholder = options.placeHolder;
        quickPick.buttons = [backButton];
        quickPick.canSelectMany = options.canSelectMany;
        quickPick.ignoreFocusOut = true;
        quickPick.items = repos.map((repo) => ({
            label: repo.name,
            description: repo.relativePath,
            detail: repo.remote,
            repo,
        }));
        quickPick.onDidTriggerButton((button) => {
            if (button === backButton) finish();
        });
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems.map((item) => item.repo);
            finish(selected.length ? selected : undefined);
        });
        quickPick.onDidHide(() => finish());
        quickPick.show();
    });
}


export { pickRepositoriesWithBackButton };
