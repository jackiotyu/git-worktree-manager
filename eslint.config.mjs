import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 6,
                sourceType: 'module',
            },
        },
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            '@typescript-eslint/naming-convention': 'warn',
            '@typescript-eslint/semi': 'warn',
            // 允许使用 any 类型
            '@typescript-eslint/no-explicit-any': 'off',
            // 允许短路求值表达式（如：cmdText && doSomething()）
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true,
                },
            ],
            curly: ['error', 'multi-line', 'consistent'],
            eqeqeq: 'warn',
            'no-throw-literal': 'warn',
            semi: 'off',
            // 禁止使用 \ 串联多行字符串
            'no-multi-str': 'error',
            // 推荐使用字符串模板连接字符串
            'prefer-template': 'warn',
            // 模板字符串中的花括号内不使用空格
            'template-curly-spacing': 'error',
            // 禁用不必要的转义
            'no-useless-escape': 'error',
            // Prettier 集成
            'prettier/prettier': 'warn',
        },
    },
    prettierConfig,
    {
        ignores: [
            'out',
            'dist',
            '**/*.d.ts',
            'node_modules',
            'webpack.config.js',
            '*.md',
            'src/@types/vscode.git.enums.ts',
            'rspack.config.js',
        ],
    },
];
