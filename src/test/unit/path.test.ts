import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import { comparePath, toSimplePath, findPrefixPath, isSubPath } from '../../core/util/path';

function withPlatform(platform: NodeJS.Platform, run: () => void) {
    describe(platform, () => {
        beforeEach(() => {
            vi.spyOn(process, 'platform', 'get').mockReturnValue(platform);
        });

        run();
    });
}

afterEach(() => {
    vi.restoreAllMocks();
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
