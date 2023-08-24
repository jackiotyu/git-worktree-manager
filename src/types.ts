/* eslint-disable @typescript-eslint/naming-convention */
export interface WorkTreeDetail {
    name: string;
    path: string;
    detached: boolean;
    prunable: boolean;
    isBranch: boolean;
    locked: boolean;
    isMain: boolean;
}

export interface WorkTreeOutputItem {
    worktree: string;
    HEAD: string;
    detached: void;
    prunable: string;
    branch?: string;
}