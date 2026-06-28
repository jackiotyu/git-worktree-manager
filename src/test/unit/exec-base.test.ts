import { describe, expect, it } from '@rstest/core';
import { buildSafeArgs } from '../../core/util/gitArgs';

describe('buildSafeArgs', () => {
    it('prepends safe.bareRepository=all with given args', () => {
        expect(buildSafeArgs('all', ['status'])).toEqual(['-c', 'safe.bareRepository=all', 'status']);
    });

    it('uses explicit value', () => {
        expect(buildSafeArgs('explicit', ['log', '-1'])).toEqual(['-c', 'safe.bareRepository=explicit', 'log', '-1']);
    });

    it('uses none value', () => {
        expect(buildSafeArgs('none', ['rev-parse'])).toEqual(['-c', 'safe.bareRepository=none', 'rev-parse']);
    });

    it('handles undefined args', () => {
        expect(buildSafeArgs('all')).toEqual(['-c', 'safe.bareRepository=all']);
    });

    it('handles empty args array', () => {
        expect(buildSafeArgs('all', [])).toEqual(['-c', 'safe.bareRepository=all']);
    });
});
