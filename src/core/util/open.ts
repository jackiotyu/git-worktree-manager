import { exec } from 'child_process';
import * as path from 'path';

type OpenCommandFunction = (target: string) => string;

let openCommand: OpenCommandFunction;

if (process.platform === 'win32') {
    openCommand = (target: string) => `start "" "${path.resolve(target)}"`;
} else if (process.platform === 'darwin') {
    openCommand = (target: string) => `open "${path.resolve(target)}"`;
} else {
    openCommand = (target: string) => `xdg-open "${path.resolve(target)}"`;
}

export async function open(target: string): Promise<void> {
    const cmd = openCommand(target);

    return new Promise((resolve, reject) => {
        exec(cmd, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
