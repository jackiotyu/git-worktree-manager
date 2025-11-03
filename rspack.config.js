// rspack.config.js

'use strict';

const path = require('path');

/** @type {import('@rspack/cli').Configuration} */
const extensionConfig = {
    target: 'node14', // VS Code extensions run in a Node.js-context
    mode: 'none', // this leaves the source code as close as possible to the original

    entry: './src/extension.ts', // the entry point of this extension
    output: {
        // the bundle is stored in the 'dist' folder
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        library: {
            type: 'commonjs2',
        },
    },
    externals: {
        vscode: 'commonjs vscode', // exclude the vscode-module
        // other modules that cannot be rspack'ed
    },
    resolve: {
        // support reading TypeScript and JavaScript files
        tsConfig: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
        },
        extensions: ['...', '.ts'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                loader: 'builtin:swc-loader',
                options: {
                    jsc: {
                        parser: {
                            syntax: 'typescript',
                        },
                        target: 'es2020',
                        externalHelpers: true,
                    },
                },
                type: 'javascript/auto',
            },
        ],
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: 'log', // enables logging required for problem matchers
    },
    optimization: {
        usedExports: true,
        innerGraph: true,
    },
    cache: true,
    experiments: {
        parallelCodeSplitting: true,
        nativeWatcher: true,
    },
};

module.exports = extensionConfig;
