import * as vscode from "vscode";
// 加载dayjs中文语言包
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';

dayjs.extend(relativeTime);
dayjs.locale(vscode.env.language); // 全局使用

export function formatQuery<T extends string>(keyList: T[]) {
    return [...new Set(keyList)].map((key) => `${key}="%(${key})"`).join(' ');
}

export function formatSimpleQuery<T extends string>(keyList: T[]) {
    return [...new Set(keyList)].map((key) => `${key}="%${key}"`).join(' ');
}

export function parseOutput<T extends string>(output: string, keyList: T[]): Record<T, string>[] {
    let tokenList = [...new Set(keyList)];
    let regex = tokenList.map((key) => `${key}="(.*)"`).join(' ');
    let workTrees = [];
    let matches = output.matchAll(new RegExp(regex, 'g'));
    for (const match of matches) {
        let item = tokenList.reduce<Record<string, string>>((obj, key, index) => {
            obj[key] = match[index + 1];
            return obj;
        }, {});
        workTrees.push(item);
    }
    return workTrees;
}

export function formatTime(time: string) {
    return dayjs(time).fromNow();
}