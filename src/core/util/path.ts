import path from 'path';

function toSimplePath(path: string) {
    return path.toLowerCase().replace(/\\/g, '/');
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
