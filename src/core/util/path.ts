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

// Find the most specific root containing fsPath, respecting path boundaries.
const findPrefixPath = (fsPath: string, strList: string[]) => {
    const target = path.resolve(fsPath);
    return strList
        .filter((candidate) => {
            const relative = path.relative(path.resolve(candidate), target);
            return (
                relative === '' ||
                (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
            );
        })
        .sort((a, b) => path.resolve(b).length - path.resolve(a).length)[0];
};

// check if child is a subpath of parent
const isSubPath = (parent: string, child: string) => {
    const parentReal = path.resolve(parent);
    const childReal = path.resolve(child);
    if (parentReal === childReal) return false;
    const relative = path.relative(parentReal, childReal);
    return !relative.startsWith(`..${path.sep}`) && relative !== '..';
};

function resolveSafeRelativePath(root: string, relativePath: string): string {
    const segments = relativePath.split(/[\\/]/);
    if (
        !relativePath ||
        path.isAbsolute(relativePath) ||
        path.win32.isAbsolute(relativePath) ||
        path.win32.parse(relativePath).root ||
        segments.some((segment) => segment === '.' || segment === '..' || /[:*?"<>|]/.test(segment))
    ) {
        throw new Error(`Path must be a safe relative path: ${relativePath}`);
    }
    const resolvedRoot = path.resolve(root);
    const normalizedRelativePath = segments.join(path.sep);
    const resolved = path.resolve(resolvedRoot, normalizedRelativePath);
    const relative = path.relative(resolvedRoot, resolved);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Path escapes the root directory: ${relativePath}`);
    }
    return resolved;
}

export { toSimplePath, comparePath, findPrefixPath, isSubPath, resolveSafeRelativePath };
