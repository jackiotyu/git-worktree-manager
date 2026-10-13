import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { removeMultiNestedReposCmd } from '../../core/command/removeMultiNestedReposCmd';
import * as nestedRepoModule from '../../core/util/nestedRepo';
import * as modalModule from '../../core/ui/modal';
import * as messageModule from '../../core/ui/message';
import * as eventsModule from '../../core/event/events';

let repos: string[] = [];
let picked: unknown[] = [];

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    l10n: { t: (text: string) => text },
    ThemeIcon: class {
        constructor() {}
    },
    Uri: { file: (fsPath: string) => ({ fsPath }) },
    workspace: {
        onDidChangeWorkspaceFolders: rs.fn(() => ({ dispose: () => {} })),
        workspaceFolders: [],
    },
    window: { showQuickPick: rs.fn(() => Promise.resolve(picked)) },
}));

rs.mock('../../core/util/nestedRepo', () => ({
    getNestedRepos: rs.fn(() => repos),
    updateNestedRepos: rs.fn(),
}));

rs.mock('../../core/ui/modal', () => ({ confirmModal: rs.fn() }));

rs.mock('../../core/ui/message', () => ({ Alert: { showInformationMessage: rs.fn() } }));

rs.mock('../../core/event/events', () => ({ treeDataEvent: { fire: rs.fn() } }));
/* eslint-enable @typescript-eslint/naming-convention */

describe('removeMultiNestedReposCmd', () => {
    beforeEach(() => {
        rs.clearAllMocks();
        repos = [];
        picked = [];
    });

    it('removes only the selected nested repos', async () => {
        repos = ['/repo/one', '/repo/two', '/repo/three'];
        picked = [{ label: 'two', description: '/repo/two' }];
        rs.mocked(modalModule.confirmModal).mockResolvedValue(true);

        await removeMultiNestedReposCmd();

        expect(nestedRepoModule.updateNestedRepos).toHaveBeenCalledWith(['/repo/one', '/repo/three']);
        expect(eventsModule.treeDataEvent.fire).toHaveBeenCalledTimes(1);
        expect(messageModule.Alert.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('keeps the selection when the confirmation is dismissed', async () => {
        repos = ['/repo/one', '/repo/two'];
        picked = [{ label: 'one', description: '/repo/one' }];
        rs.mocked(modalModule.confirmModal).mockResolvedValue(false);

        await removeMultiNestedReposCmd();

        expect(nestedRepoModule.updateNestedRepos).not.toHaveBeenCalled();
        expect(eventsModule.treeDataEvent.fire).not.toHaveBeenCalled();
    });

    it('does nothing when no item is selected', async () => {
        repos = ['/repo/one'];
        picked = [];

        await removeMultiNestedReposCmd();

        expect(modalModule.confirmModal).not.toHaveBeenCalled();
        expect(nestedRepoModule.updateNestedRepos).not.toHaveBeenCalled();
    });
});
