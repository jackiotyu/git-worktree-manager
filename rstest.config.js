'use strict';

const path = require('node:path');
const { defineConfig } = require('@rstest/core');

module.exports = defineConfig({
    testEnvironment: 'node',
    include: ['src/test/**/*.{test,spec}.ts'],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
