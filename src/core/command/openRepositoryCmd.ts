import * as vscode from "vscode";
import { IWorktreeLess } from '@/types';

export const openRepositoryCmd = (item: IWorktreeLess) => {
    vscode.commands.executeCommand('git.openRepository', item.path);
};