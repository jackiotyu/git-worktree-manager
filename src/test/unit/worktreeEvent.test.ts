import * as vscode from 'vscode';
import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { worktreeEventRegister } from '../../core/event/git';

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    EventEmitter: class {
        event = () => ({ dispose: () => {} });
        fire() {}
        dispose() {}
    },
    RelativePattern: class {},
    Uri: {
        file: (fsPath: string) => ({ fsPath }),
        joinPath: (uri: { fsPath: string }, name: string) => ({ fsPath: `${uri.fsPath}/${name}` }),
    },
    workspace: {
        createFileSystemWatcher: rs.fn(() => ({
            dispose: () => {},
            onDidChange: () => ({ dispose: () => {} }),
            onDidCreate: () => ({ dispose: () => {} }),
            onDidDelete: () => ({ dispose: () => {} }),
        })),
    },
}));
/* eslint-enable @typescript-eslint/naming-convention */

rs.mock('../../core/log/logger', () => ({
    default: { log: () => {}, error: () => {} },
}));

describe('WorktreeEventRegister', () => {
    beforeEach(() => {
        worktreeEventRegister.dispose();
        rs.clearAllMocks();
    });

    afterEach(() => {
        worktreeEventRegister.dispose();
        rs.restoreAllMocks();
    });

    it('does not create a watcher after a pending add is removed', async () => {
        let finishStat: () => void = () => {};
        rs.spyOn(fs.promises, 'stat').mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishStat = () => resolve({} as fs.Stats);
                }),
        );

        const uri = vscode.Uri.file('/test/repo');
        const pending = worktreeEventRegister.add(uri);
        worktreeEventRegister.remove(uri);
        finishStat();
        await pending;

        expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
    });

    it('does not create a watcher after pending adds are disposed', async () => {
        let finishStat: () => void = () => {};
        rs.spyOn(fs.promises, 'stat').mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishStat = () => resolve({} as fs.Stats);
                }),
        );

        const pending = worktreeEventRegister.add(vscode.Uri.file('/test/repo'));
        worktreeEventRegister.dispose();
        finishStat();
        await pending;

        expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
    });

    it('allows a new add after removing a pending registration', async () => {
        const finishStats: Array<() => void> = [];
        rs.spyOn(fs.promises, 'stat').mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishStats.push(() => resolve({} as fs.Stats));
                }),
        );

        const uri = vscode.Uri.file('/test/repo');
        const stale = worktreeEventRegister.add(uri);
        worktreeEventRegister.remove(uri);
        const current = worktreeEventRegister.add(uri);

        finishStats[0]();
        await stale;
        expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();

        finishStats[1]();
        await current;
        expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(1);
    });
});
