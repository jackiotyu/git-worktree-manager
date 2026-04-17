import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { comparePath, toSimplePath } from '../../core/util/path';

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
