import { describe, expect, it } from 'vitest';
import { parseUpstream } from '../../core/util/ref';

describe('parseUpstream', () => {
    it('parses simple remote/branch', () => {
        expect(parseUpstream('origin/main')).toEqual({ remote: 'origin', branch: 'main' });
    });

    it('parses branch with slashes', () => {
        expect(parseUpstream('upstream/feature/my-feature')).toEqual({
            remote: 'upstream',
            branch: 'feature/my-feature',
        });
    });

    it('parses branch with dots', () => {
        expect(parseUpstream('origin/v1.0.x')).toEqual({ remote: 'origin', branch: 'v1.0.x' });
    });

    it('parses single-segment as remote only', () => {
        expect(parseUpstream('origin/')).toEqual({ remote: 'origin', branch: '' });
    });
});
