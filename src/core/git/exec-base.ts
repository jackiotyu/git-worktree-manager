/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { Config } from '@/core/config/setting';
import logger from '@/core/log/logger';
import treeKill = require('tree-kill');

export const execBase = (cwd: string, args?: string[], token?: vscode.CancellationToken): Promise<string> => {
    return new Promise((resolve, reject) => {
        logger.log(`'Running in' ${cwd}`);
        logger.log(`> ${['git'].concat(args || []).join(' ')}`);
        const httpProxy = Config.get('httpProxy', '');
        let env = process.env;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        if (httpProxy) Object.assign(env, { http_proxy: httpProxy, https_proxy: httpProxy });
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
            logger.trace(chunk.toString());
        });
        proc.stderr.on('data', (chunk) => {
            err = Buffer.concat([err, chunk]);
            logger.error(chunk.toString());
        });
        token?.onCancellationRequested(() => {
            proc.kill('SIGTERM');
            if (proc.pid) {
                treeKill(proc.pid, 'SIGTERM');
            }
        });
        proc.once('error', reject);
        proc.once('close', (code, signal) => {
            logger.trace('[exec close] ', code, signal);
            if (signal === 'SIGTERM') {
                return resolve('');
            }
            if (code === 0) {
                resolve(out.toString());
            } else {
                reject(Error(err.toString()));
            }
        });
    });
};