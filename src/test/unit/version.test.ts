import { describe, expect, it } from 'vitest';
import { compare, from, fromString, satisfies } from '../../core/util/version';

describe('from', () => {
    it('creates version from numbers', () => {
        expect(from(1, 2, 3)).toEqual({ major: 1, minor: 2, patch: 3, pre: undefined });
    });

    it('creates version from strings', () => {
        expect(from('1', '2', '3')).toEqual({ major: 1, minor: 2, patch: 3, pre: undefined });
    });

    it('defaults patch to 0 when omitted', () => {
        expect(from(1, 2)).toEqual({ major: 1, minor: 2, patch: 0, pre: undefined });
    });

    it('includes pre-release tag', () => {
        expect(from(1, 2, 3, 'beta.1')).toEqual({ major: 1, minor: 2, patch: 3, pre: 'beta.1' });
    });

    it('handles null patch', () => {
        expect(from(1, 2, null)).toEqual({ major: 1, minor: 2, patch: 0, pre: undefined });
    });
});

describe('fromString', () => {
    it('parses simple semantic version', () => {
        expect(fromString('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, pre: undefined });
    });

    it('parses version with pre-release', () => {
        expect(fromString('2.0.0-alpha')).toEqual({ major: 2, minor: 0, patch: 0, pre: 'alpha' });
    });

    it('parses version with multi-part pre-release', () => {
        expect(fromString('3.0.0-rc.1')).toEqual({ major: 3, minor: 0, patch: 0, pre: 'rc.1' });
    });

    it('parses single-digit version', () => {
        expect(fromString('1.0')).toEqual({ major: 1, minor: 0, patch: 0, pre: undefined });
    });
});

describe('compare', () => {
    it('returns 0 for equal versions', () => {
        expect(compare('1.2.3', '1.2.3')).toBe(0);
    });

    it('returns 1 when first version is greater (major)', () => {
        expect(compare('2.0.0', '1.0.0')).toBe(1);
    });

    it('returns -1 when first version is lesser (major)', () => {
        expect(compare('1.0.0', '2.0.0')).toBe(-1);
    });

    it('returns 1 when first version is greater (minor)', () => {
        expect(compare('1.3.0', '1.2.0')).toBe(1);
    });

    it('returns -1 when first version is lesser (minor)', () => {
        expect(compare('1.2.0', '1.3.0')).toBe(-1);
    });

    it('returns 1 when first version is greater (patch)', () => {
        expect(compare('1.2.5', '1.2.4')).toBe(1);
    });

    it('returns -1 when first version is lesser (patch)', () => {
        expect(compare('1.2.4', '1.2.5')).toBe(-1);
    });

    it('considers release version greater than pre-release', () => {
        expect(compare('1.0.0', '1.0.0-alpha')).toBe(1);
    });

    it('considers pre-release less than release', () => {
        expect(compare('1.0.0-beta', '1.0.0')).toBe(-1);
    });

    it('compares pre-release tags lexicographically', () => {
        expect(compare('1.0.0-beta', '1.0.0-alpha')).toBe(1);
    });

    it('accepts Version objects directly', () => {
        expect(compare(from(2, 0, 0), from(1, 0, 0))).toBe(1);
    });

    it('handles implicit zero patch', () => {
        expect(compare('2.0', '1.0.0')).toBe(1);
    });
});

describe('satisfies', () => {
    it('exact match with =', () => {
        expect(satisfies('1.2.3', '= 1.2.3')).toBe(true);
    });

    it('exact mismatch with =', () => {
        expect(satisfies('1.2.4', '= 1.2.3')).toBe(false);
    });

    it('greater than with >', () => {
        expect(satisfies('2.0.0', '> 1.0.0')).toBe(true);
    });

    it('not greater than with >', () => {
        expect(satisfies('1.0.0', '> 1.0.0')).toBe(false);
    });

    it('greater than or equal with >=', () => {
        expect(satisfies('1.0.0', '>= 1.0.0')).toBe(true);
    });

    it('greater than or equal with >= (greater)', () => {
        expect(satisfies('2.0.0', '>= 1.0.0')).toBe(true);
    });

    it('not greater than or equal with >=', () => {
        expect(satisfies('0.9.0', '>= 1.0.0')).toBe(false);
    });

    it('less than with <', () => {
        expect(satisfies('0.9.0', '< 1.0.0')).toBe(true);
    });

    it('not less than with <', () => {
        expect(satisfies('1.0.0', '< 1.0.0')).toBe(false);
    });

    it('less than or equal with <=', () => {
        expect(satisfies('1.0.0', '<= 1.0.0')).toBe(true);
    });

    it('less than or equal with <= (lesser)', () => {
        expect(satisfies('0.9.0', '<= 1.0.0')).toBe(true);
    });

    it('not less than or equal with <=', () => {
        expect(satisfies('1.1.0', '<= 1.0.0')).toBe(false);
    });

    it('returns false for null input', () => {
        expect(satisfies(null as unknown as string, '>= 1.0.0')).toBe(false);
    });

    it('returns false for undefined input', () => {
        expect(satisfies(undefined as unknown as string, '>= 1.0.0')).toBe(false);
    });

    it('works with Version objects', () => {
        expect(satisfies(from(1, 2, 3), '= 1.2.3')).toBe(true);
    });
});
