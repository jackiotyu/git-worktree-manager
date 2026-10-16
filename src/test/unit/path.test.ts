import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import path from 'path';
import { comparePath, toSimplePath, findPrefixPath, isSubPath, resolveSafeRelativePath } from '../../core/util/path';

function withPlatform(platform: NodeJS.Platform, run: () => void) {
    describe(platform, () => {
        beforeEach(() => {
            rs.spyOn(process, 'platform', 'get').mockReturnValue(platform);
        });

        run();
    });
}

afterEach(() => {
    rs.restoreAllMocks();
});

describe('toSimplePath', () => {
    it('returns an empty string for blank input', () => {
        expect(toSimplePath('   ')).toBe('');
    });

    withPlatform('linux', () => {
        it('normalizes dot segments on posix', () => {
            expect(toSimplePath('workspace/./repo')).toBe('workspace/repo');
        });

        it('removes trailing separators from non-root posix paths', () => {
            expect(toSimplePath('workspace/repo/')).toBe('workspace/repo');
        });
    });

    withPlatform('win32', () => {
        it('keeps the trailing separator for Windows drive roots', () => {
            expect(toSimplePath('C:/')).toBe('c:/');
        });

        it('normalizes Windows separators and drive letter case on win32', () => {
            expect(toSimplePath('C:\\Workspace\\Repo\\')).toBe('c:/Workspace/Repo');
        });
    });
});

describe('comparePath', () => {
    withPlatform('linux', () => {
        it('treats paths with trailing separators as equal on posix', () => {
            expect(comparePath('workspace/repo', 'workspace/repo/')).toBe(true);
        });

        it('treats dot segments as equivalent paths on posix', () => {
            expect(comparePath('workspace/repo', 'workspace/./repo')).toBe(true);
        });
    });

    withPlatform('win32', () => {
        it('handles Windows-style paths consistently on win32', () => {
            expect(comparePath('D:/workspace/repo', 'd:\\workspace\\repo\\')).toBe(true);
        });
    });
});

describe('findPrefixPath', () => {
    it('finds matching prefix from list', () => {
        expect(findPrefixPath('/home/user/projects/my-app/src', ['/home/user/projects'])).toBe('/home/user/projects');
    });

    it('returns first matching prefix', () => {
        const prefixes = ['/var/log', '/home/user'];
        expect(findPrefixPath('/home/user/projects', prefixes)).toBe('/home/user');
    });

    it('returns undefined when no prefix matches', () => {
        expect(findPrefixPath('/opt/app', ['/home/user', '/var/log'])).toBeUndefined();
    });

    it('returns undefined for empty list', () => {
        expect(findPrefixPath('/home/user', [])).toBeUndefined();
    });
});

describe('isSubPath', () => {
    it('returns true for direct child', () => {
        expect(isSubPath('/parent', '/parent/child')).toBe(true);
    });

    it('returns true for nested descendant', () => {
        expect(isSubPath('/parent', '/parent/child/grandchild')).toBe(true);
    });

    it('returns false for same path', () => {
        expect(isSubPath('/parent', '/parent')).toBe(false);
    });

    it('returns false for parent path (reverse)', () => {
        expect(isSubPath('/parent/child', '/parent')).toBe(false);
    });

    it('returns false for unrelated path', () => {
        expect(isSubPath('/parent', '/other')).toBe(false);
    });

    it('handles relative paths', () => {
        expect(isSubPath('parent', 'parent/child')).toBe(true);
    });

    it('handles cross-platform separators', () => {
        const sep = path.sep === '\\' ? '\\' : '/';
        expect(isSubPath(`${sep}parent`, `${sep}parent${sep}child`)).toBe(true);
    });
});

describe('resolveSafeRelativePath', () => {
    const root = path.resolve('workspace');

    it('resolves a safe nested relative path under the root', () => {
        expect(resolveSafeRelativePath(root, 'packages/client')).toBe(path.resolve(root, 'packages/client'));
    });

    it('rejects empty paths and the root itself', () => {
        expect(() => resolveSafeRelativePath(root, '')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, '.')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, './packages/client')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, 'packages/./client')).toThrow('Path must be a safe relative path');
    });

    it('normalizes both separator styles when resolving relative paths', () => {
        const expected = path.resolve(root, 'packages/client');
        expect(resolveSafeRelativePath(root, 'packages/client')).toBe(expected);
        expect(resolveSafeRelativePath(root, 'packages\\\\client')).toBe(expected);
    });

    it('rejects absolute paths on POSIX and Windows', () => {
        expect(() => resolveSafeRelativePath(root, '/tmp/outside')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, 'C:\\outside')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, '\\\\server\\share')).toThrow('Path must be a safe relative path');
    });

    it('rejects parent traversal segments regardless of separator', () => {
        expect(() => resolveSafeRelativePath(root, '../outside')).toThrow('Path must be a safe relative path');
        expect(() => resolveSafeRelativePath(root, 'packages/../../outside')).toThrow(
            'Path must be a safe relative path',
        );
        expect(() => resolveSafeRelativePath(root, 'packages\\..\\outside')).toThrow(
            'Path must be a safe relative path',
        );
    });
});
