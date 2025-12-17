/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as cp from 'child_process';
import type { GitExtension, API as ScmGitApi } from '@/@types/vscode.git';
import { Config } from '@/core/config/setting';
import { withResolvers } from '@/core/util/promise';
import logger from '@/core/log/logger';
import treeKill = require('tree-kill');

export interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

let scmGitApi: ScmGitApi | undefined;

const getScmGitApiCore = async (): Promise<ScmGitApi | undefined> => {
    try {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!extension) return undefined;
        const gitExtension = extension.isActive ? extension.exports : await extension.activate();
        return gitExtension?.getAPI(1);
    } catch {
        return undefined;
    }
};

/**
 * Get the Git executable path used by VSCode Git extension
 * VSCode Git extension uses git.path configuration, or automatically finds system Git if not set
 */
const getGitPath = async (): Promise<string> => {
    try {
        // Ensure Git extension is activated (if needed)
        if (!scmGitApi) {
            scmGitApi = await getScmGitApiCore();
        }
        if (!scmGitApi) return 'git';
        return scmGitApi.git.path;
    } catch (error) {
        logger.error(`Failed to get Git path: ${error}`);
        // Fallback to default value on error
        return 'git';
    }
};

export const execBase = async (cwd: string, args?: string[], token?: vscode.CancellationToken): Promise<ExecResult> => {
    const gitPath = await getGitPath();

    const { resolve, reject, promise } = withResolvers<ExecResult>();

    logger.log(`'Running in' ${cwd}`);
    logger.log(`> ${[gitPath].concat(args || []).join(' ')}`);

    const env = Object.assign({}, process.env);
    if (!env['PATH']) env['PATH'] = env['Path'] || '';

    const httpProxy = Config.get('httpProxy', '');
    if (httpProxy) {
        env['http_proxy'] = httpProxy;
        env['https_proxy'] = httpProxy;
    }
    const proc = cp.spawn(gitPath, args, {
        cwd,
        env: {
            ...env,
            GCM_INTERACTIVE: 'NEVER',
            GCM_PRESERVE_CREDS: 'TRUE',
            LC_ALL: 'C',
        },
    });

    let out: Buffer = Buffer.from('', 'utf-8');
    let err: Buffer = Buffer.from('', 'utf-8');

    proc.stdout.on('data', (chunk) => {
        out = Buffer.concat([out, chunk]);
        logger.trace(`[stdout] ${chunk.toString()}`);
    });

    proc.stderr.on('data', (chunk) => {
        err = Buffer.concat([err, chunk]);
        logger.error(`[stderr] ${chunk.toString()}`);
    });

    token?.onCancellationRequested(() => {
        logger.error('[exec] Process cancellation requested');
        proc.kill('SIGTERM');
        if (proc.pid) {
            treeKill(proc.pid, 'SIGTERM');
        }
    });

    proc.once('error', (e) => {
        logger.error(`[exec error] ${e.message}`);
        reject(e);
    });

    proc.once('close', (code, signal) => {
        logger.trace('[exec close] ', code, signal);

        if (signal === 'SIGTERM') {
            return resolve({ stdout: '', stderr: 'Process cancelled', code });
        }

        if (code === 0) {
            resolve({ stdout: out.toString(), stderr: err.toString(), code });
        } else {
            reject(Error(err.toString()));
        }
    });

    return promise;
};
