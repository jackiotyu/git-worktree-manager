import path from 'path';

function toSimplePath(input: string = '') {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const isWindows = process.platform === 'win32';
    let normalized = isWindows ? path.win32.normalize(trimmed) : path.posix.normalize(trimmed);

    if (isWindows) {
        // Normalize Windows paths into a stable comparison format.
        normalized = normalized.replace(/\\/g, '/');
        const diskPattern = /^[a-zA-Z]:/;
        const match = normalized.match(diskPattern);
        if (match) {
            normalized = match[0].toLowerCase() + normalized.slice(match[0].length);
        }
    }

    if (normalized.length > 1) {
        // Remove trailing separators so equivalent paths compare consistently,
        // but keep the separator for Windows drive roots like "c:/".
        normalized = normalized.replace(/[\\/]+$/, '');
        if (/^[a-z]:$/i.test(normalized)) {
            normalized += '/';
        }
    }
    return normalized;
}

function comparePath(path1: string = '', path2: string = '') {
    return toSimplePath(path1) === toSimplePath(path2);
}

// find prefix path in list
const findPrefixPath = (fsPath: string, strList: string[]) => {
    return strList.find((str) => fsPath.startsWith(str));
};

// check if child is a subpath of parent
const isSubPath = (parent: string, child: string) => {
    const parentReal = path.resolve(parent);
    const childReal = path.resolve(child);
    if (parentReal === childReal) return false;
    const relative = path.relative(parentReal, childReal);
    return !relative.startsWith(`..${path.sep}`) && relative !== '..';
};

export { toSimplePath, comparePath, findPrefixPath, isSubPath };
