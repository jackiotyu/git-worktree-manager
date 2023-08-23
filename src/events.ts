import * as vscode from 'vscode';
import { WorkTreeDetail } from './types';

export const treeDataEvent = new vscode.EventEmitter<WorkTreeDetail[]>();
export const updateTreeDataEvent = new vscode.EventEmitter<void>();