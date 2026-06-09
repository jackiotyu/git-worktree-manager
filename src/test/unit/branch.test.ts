import { describe, expect, it, rs } from '@rstest/core';
import { sanitizeBranchName } from '../../core/util/branch';

/* eslint-disable @typescript-eslint/naming-convention */
rs.mock('vscode', () => ({
    workspace: {
        getConfiguration: () => ({
            get: (key: string) => {
                if (key === 'branchWhitespaceChar') return '-';
                if (key === 'branchValidationRegex') return '';
                return undefined;
            },
        }),
    },
    l10n: {
        t: (message: string, ...args: any[]) => {
            return message.replace('{0}', args[0]);
        },
    },
    InputBoxValidationSeverity: {
        Info: 0,
        Error: 1,
    },
}));

describe('sanitizeBranchName', () => {
    it('returns empty string for empty input', () => {
        expect(sanitizeBranchName('')).toBe('');
    });

    it('returns falsy for undefined', () => {
        expect(sanitizeBranchName(undefined as unknown as string)).toBeUndefined();
    });

    it('trims whitespace', () => {
        expect(sanitizeBranchName('  my-branch  ')).toBe('my-branch');
    });

    it('removes leading dashes', () => {
        expect(sanitizeBranchName('---my-branch')).toBe('my-branch');
    });

    it('replaces leading dot', () => {
        expect(sanitizeBranchName('.my-branch')).toBe('-my-branch');
    });

    it('replaces consecutive dots in middle', () => {
        expect(sanitizeBranchName('my..branch')).toBe('my-branch');
    });

    it('replaces tilde', () => {
        expect(sanitizeBranchName('my~branch')).toBe('my-branch');
    });

    it('replaces caret', () => {
        expect(sanitizeBranchName('my^branch')).toBe('my-branch');
    });

    it('replaces colon', () => {
        expect(sanitizeBranchName('my:branch')).toBe('my-branch');
    });

    it('replaces trailing slash', () => {
        expect(sanitizeBranchName('my-branch/')).toBe('my-branch-');
    });

    it('replaces .lock suffix', () => {
        expect(sanitizeBranchName('my-branch.lock')).toBe('my-branch-');
    });

    it('replaces backslash', () => {
        expect(sanitizeBranchName('my\\branch')).toBe('my-branch');
    });

    it('replaces asterisk', () => {
        expect(sanitizeBranchName('my*branch')).toBe('my-branch');
    });

    it('replaces spaces', () => {
        expect(sanitizeBranchName('my branch')).toBe('my-branch');
    });

    it('replaces trailing dot', () => {
        expect(sanitizeBranchName('my-branch.')).toBe('my-branch-');
    });

    it('replaces square brackets', () => {
        expect(sanitizeBranchName('my[branch]')).toBe('my-branch-');
    });

    it('uses custom whitespace char', () => {
        expect(sanitizeBranchName('my branch', '_')).toBe('my_branch');
    });

    it('handles complex branch name', () => {
        expect(sanitizeBranchName('  FEAT/my cool~feature^v2.0  ')).toBe('FEAT/my-cool-feature-v2.0');
    });

    it('allows valid branch name unchanged', () => {
        expect(sanitizeBranchName('feature/my-cool-feature')).toBe('feature/my-cool-feature');
    });

    it('allows simple branch name unchanged', () => {
        expect(sanitizeBranchName('main')).toBe('main');
    });
});
