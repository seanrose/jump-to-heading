import { describe, expect, it } from 'vitest';
import { calculateScrollAdjustment, isJumpPosition } from '../src/jump-position';

describe('calculateScrollAdjustment', () => {
	it('leaves centered headings unchanged', () => {
		expect(calculateScrollAdjustment('center', 900)).toBe(0);
	});

	it('moves balanced headings to the upper third', () => {
		expect(calculateScrollAdjustment('balanced', 900)).toBeCloseTo(150);
	});

	it('moves top-aligned headings close to the top edge', () => {
		expect(calculateScrollAdjustment('top', 1000)).toBe(420);
	});

	it('does not return a negative adjustment for an invalid viewport height', () => {
		expect(calculateScrollAdjustment('top', -100)).toBe(0);
	});
});

describe('isJumpPosition', () => {
	it.each(['balanced', 'center', 'top'])('accepts %s', (value) => {
		expect(isJumpPosition(value)).toBe(true);
	});

	it('rejects unknown saved values', () => {
		expect(isJumpPosition('bottom')).toBe(false);
	});
});
