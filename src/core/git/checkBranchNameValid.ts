import * as vscode from 'vscode';
import { execAuto } from '@/core/git/exec';

export async function checkBranchNameValid(cwd: string, branchName: string) {
    try {
        await execAuto(cwd, ['check-ref-format', '--branch', branchName]);
        return true;
    } catch (error) {
        return false;
    }
}
