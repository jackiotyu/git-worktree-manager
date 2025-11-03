import * as vscode from 'vscode';

export class Logger implements vscode.Disposable {
    private output = vscode.window.createOutputChannel('Git Worktree Manager', { log: true });
    private visible = false;
    log(str: string) {
        const lines = str.split(/\r?\n/gm);
        while (/^\s*$/.test(lines[lines.length - 1])) {
            lines.pop();
        }
        this.output.appendLine(lines.join('\n'));
    }
    toggle = () => {
        this.visible = !this.visible;
        this.output.show();
        if (this.visible) this.output.show();
        else this.output.hide();
    };
    error(str: any) {
        this.output.error(str);
    }
    trace(str: string, ...args: any[]) {
        this.output.trace(str, ...args);
    }
    dispose() {
        this.output.dispose();
    }
}

export default new Logger();
