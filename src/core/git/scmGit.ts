import * as vscode from 'vscode';
import type { GitExtension, API as ScmGitApi } from '@/@types/vscode.git';
import logger from '@/core/log/logger';

export class GitApi implements vscode.Disposable {
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

    private _activatingPromise?: Promise<void>;

    async getAPI(): Promise<ScmGitApi | undefined> {
        if (this._disposed) return undefined;
        if (this._api) return this._api;

        try {
            const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
            if (!extension) return undefined;

            if (!extension.isActive) {
                await this.activateGitExtension(extension);
            }
            if (this._disposed) return undefined;
            if (this._api) return this._api;

            if (extension.isActive) {
                this.cacheAPI(extension.exports?.getAPI(1));
            }
            return this._api;
        } catch (error) {
            logger.error(`Failed to get SCM Git API: ${error}`);
            return undefined;
        }
    }

    private activateGitExtension(extension: vscode.Extension<GitExtension>): Promise<void> {
        if (!this._activatingPromise) {
            const pending = Promise.resolve(extension.activate())
                .then((gitExtension) => {
                    if (this._disposed) return;
                    this.cacheAPI(gitExtension?.getAPI(1));
                })
                .finally(() => {
                    if (this._activatingPromise === pending) {
                        this._activatingPromise = undefined;
                    }
                });
            this._activatingPromise = pending;
        }
        return this._activatingPromise;
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
