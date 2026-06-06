import { describe, expect, it, vi } from 'vitest';
import { formatQuery, formatSimpleQuery, parseOutput, parseObjStr } from '../../core/util/parse';

/* eslint-disable @typescript-eslint/naming-convention */
vi.mock('vscode', () => ({
    env: { language: 'en' },
}));

describe('formatQuery', () => {
    it('formats single key', () => {
        expect(formatQuery(['worktree'])).toBe('worktree="%(worktree)"');
    });

    it('formats multiple keys', () => {
        const result = formatQuery(['worktree', 'HEAD', 'branch']);
        expect(result).toContain('worktree="%(worktree)"');
        expect(result).toContain('HEAD="%(HEAD)"');
        expect(result).toContain('branch="%(branch)"');
    });

    it('deduplicates keys', () => {
        expect(formatQuery(['worktree', 'worktree'])).toBe('worktree="%(worktree)"');
    });

    it('returns empty string for empty list', () => {
        expect(formatQuery([])).toBe('');
    });
});

describe('formatSimpleQuery', () => {
    it('formats single key without parens', () => {
        expect(formatSimpleQuery(['refname'])).toBe('refname="%refname"');
    });

    it('formats multiple keys', () => {
        const result = formatSimpleQuery(['refname', 'objecttype']);
        expect(result).toContain('refname="%refname"');
        expect(result).toContain('objecttype="%objecttype"');
    });
});

describe('parseOutput', () => {
    it('parses single line output', () => {
        const output = 'worktree="/path/to/repo" HEAD="abc123" branch="refs/heads/main"';
        const result = parseOutput(output, ['worktree', 'HEAD', 'branch']);
        expect(result).toEqual([
            {
                worktree: '/path/to/repo',
                HEAD: 'abc123',
                branch: 'refs/heads/main',
            },
        ]);
    });

    it('parses multi-line output', () => {
        const output = [
            'worktree="/main" HEAD="111" branch="refs/heads/main"',
            'worktree="/worktree/feature" HEAD="222" branch="refs/heads/feature"',
        ].join('\n');
        const result = parseOutput(output, ['worktree', 'HEAD', 'branch']);
        expect(result).toHaveLength(2);
        expect(result[0].worktree).toBe('/main');
        expect(result[1].branch).toBe('refs/heads/feature');
    });

    it('handles special characters in values', () => {
        const output = 'worktree="/path/with (parens)" HEAD="abc"';
        const result = parseOutput(output, ['worktree', 'HEAD']);
        expect(result[0].worktree).toBe('/path/with (parens)');
    });

    it('returns empty array when no match', () => {
        expect(parseOutput('some random text', ['worktree'])).toEqual([]);
    });

    it('deduplicates key list', () => {
        const output = 'worktree="/path" HEAD="abc"';
        expect(parseOutput(output, ['worktree', 'worktree'])).toHaveLength(1);
    });
});

describe('parseObjStr', () => {
    it('parses valid JSON', () => {
        expect(parseObjStr('{"a": 1, "b": "hello"}')).toEqual({ a: 1, b: 'hello' });
    });

    it('returns empty object for invalid JSON', () => {
        expect(parseObjStr('not json')).toEqual({});
    });

    it('returns empty object for empty string', () => {
        expect(parseObjStr('')).toEqual({});
    });

    it('parses JSON array', () => {
        expect(parseObjStr('[1, 2, 3]')).toEqual([1, 2, 3]);
    });
});
