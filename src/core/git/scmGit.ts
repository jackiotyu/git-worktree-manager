import * as vscode from 'vscode';
import type { GitExtension, API as ScmGitApi } from '@/@types/vscode.git';
import logger from '@/core/log/logger';

class GitApi implements vscode.Disposable {
    private _api: ScmGitApi | undefined;
    private _gitPath: string = 'git';
    private _gitEnv: Record<string, string> = {};
    private _disposed: boolean = false;
    constructor() {
        this._api = undefined;
    }

    get gitPath(): string {
        return this._gitPath;
    }

    get gitEnv(): Record<string, string> {
        return this._gitEnv;
    }

    async getAPI(): Promise<ScmGitApi | undefined> {
        try {
            if (this._disposed) return undefined;
            // Check if the API is already cached
            if (this._api) return this._api;

            const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
            if (!extension) return undefined;
            const gitExtension = extension.isActive ? extension.exports : await extension.activate();

            // Cache the API and Git path/env
            this.cacheAPI(gitExtension?.getAPI(1));

            return this._api;
        } catch (error) {
            logger.error(`Failed to get SCM Git API: ${error}`);
            this.cacheAPI(undefined);
            return undefined;
        }
    }

    private cacheAPI(api?: ScmGitApi): void {
        this._api = api;
        this._gitPath = api?.git.path || 'git';
        this._gitEnv = (api?.git as any).env || {};
    }

    dispose(): void {
        this._api = undefined;
        this._disposed = true;
    }
}

const gitApi = new GitApi();

export { gitApi };
