export function getTerminalNameTemplateConfig() {
    return Config.get('terminalNameTemplate', '${label} ⇄ ${fullPath}');
}
import * as vscode from "vscode";
import { GlobalState } from '@/core/state';
import { Config } from '@/core/config/setting';
import { IFolderItemConfig } from '@/types';

export function getFolderConfig() {
    return GlobalState.get('gitFolders', []);
}

export function getTerminalLocationConfig() {
    return Config.get('terminalLocationInEditor', false)
        ? vscode.TerminalLocation.Editor
        : vscode.TerminalLocation.Panel;
}

export function getTerminalCmdListConfig() {
    return Config.get('terminalCmdList', []);
}

export function updateFolderConfig(value: IFolderItemConfig[]) {
    return GlobalState.update('gitFolders', value);
}