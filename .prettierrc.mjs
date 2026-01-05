export default {
    printWidth: 120, // 每行最大字符数，超出会换行
    tabWidth: 4, // 缩进的空格数
    useTabs: false, // 是否使用 Tab 进行缩进
    semi: true, // 语句末尾是否加分号
    singleQuote: true, // 是否使用单引号
    quoteProps: 'as-needed', // 仅在需要时为对象的 key 添加引号
    jsxSingleQuote: false, // 在 JSX 中使用单引号
    trailingComma: 'all', // 末尾逗号：none | es5 | all
    bracketSpacing: true, // 对象花括号内部是否有空格
    bracketSameLine: false, // JSX 标签的 `>` 是否换行
    arrowParens: 'always', // 箭头函数参数是否使用括号（always | avoid）
    proseWrap: 'preserve', // Markdown 文本换行方式
    htmlWhitespaceSensitivity: 'css', // HTML 空格敏感度
    endOfLine: 'lf', // 换行符：lf | crlf | cr | auto
    embeddedLanguageFormatting: 'auto', // 是否格式化嵌入的代码
};
