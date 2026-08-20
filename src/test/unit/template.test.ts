import { describe, expect, it } from '@rstest/core';

/* eslint-disable @typescript-eslint/naming-convention */
import { formatTemplate } from '../../core/util/template';

describe('formatTemplate', () => {
    it('replaces a single variable', () => {
        expect(formatTemplate('$BASE_NAME', { BASE_NAME: 'my-worktree' })).toBe('my-worktree');
    });

    it('replaces multiple variables', () => {
        const result = formatTemplate('$BASE_NAME ⇄ $REF_NAME', {
            BASE_NAME: 'heyflow1',
            REF_NAME: 'feat/some-branch',
        });
        expect(result).toBe('heyflow1 ⇄ feat/some-branch');
    });

    it('replaces repeated occurrences of the same variable', () => {
        expect(formatTemplate('$NAME/$NAME', { NAME: 'x' })).toBe('x/x');
    });

    it('leaves unknown tokens untouched', () => {
        expect(formatTemplate('$UNKNOWN - $BASE_NAME', { BASE_NAME: 'wt' })).toBe('$UNKNOWN - wt');
    });

    it('returns the template unchanged when it has no tokens', () => {
        expect(formatTemplate('plain text', { BASE_NAME: 'wt' })).toBe('plain text');
    });

    it('handles empty template', () => {
        expect(formatTemplate('', { BASE_NAME: 'wt' })).toBe('');
    });
});
