export type JumpPosition = 'balanced' | 'center' | 'top';

const TARGET_VIEWPORT_RATIOS: Record<JumpPosition, number> = {
	balanced: 1 / 3,
	center: 1 / 2,
	top: 0.08,
};

/**
 * Calculate the scroll adjustment after initially centering a heading.
 * Positive values move the heading toward the top of the viewport.
 */
export function calculateScrollAdjustment(
	position: JumpPosition,
	viewportHeight: number,
): number {
	const targetRatio = TARGET_VIEWPORT_RATIOS[position];
	return Math.max(0, viewportHeight) * (0.5 - targetRatio);
}

export function isJumpPosition(value: unknown): value is JumpPosition {
	return value === 'balanced' || value === 'center' || value === 'top';
}
