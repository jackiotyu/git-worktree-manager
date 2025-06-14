/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { Config } from '@/core/config/setting';
import logger from '@/core/log/logger';
import treeKill = require('tree-kill');

export interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

export const execBase = (
    cwd: string,
    args?: string[],
    token?: vscode.CancellationToken
): Promise<ExecResult> => {
    return new Promise((resolve, reject) => {
        logger.log(`'Running in' ${cwd}`);
        logger.log(`> ${['git'].concat(args || []).join(' ')}`);
        const httpProxy = Config.get('httpProxy', '');
        let env = process.env;
        if (httpProxy) {
            Object.assign(env, {
                http_proxy: httpProxy,
                https_proxy: httpProxy,
            });
        }

        const proc = cp.spawn('git', args, {
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
    });
};
