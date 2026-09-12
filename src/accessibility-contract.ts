// ---------------------------------------------------------------------------
// PULSE — Accessibility Contract & Helpers
//
// Centralized types and helpers for consistent accessibility behavior across
// all Pulse shared UI primitives.
//
// ............................................................................
// Design principles
// ............................................................................
//  3. Disabled and pending states are always exposed to assistive technology
//     via accessibilityState.disabled and (when applicable) opacity reduction
//     on the visual layer only.
//
//  4. Modal/drawer overlays use React Native's accessibilityViewIsModal and
//     announce their title. On iOS this is the native behavior; on web the same
//     prop maps to aria-modal.
//
//  5. Informative images carry accessibilityLabel; decorative images are marked
//     decorative (accessible={false}) so screen readers skip them.
//
//  6. Form errors expose accessibilityInvalid on the field and are announced via
//     an alert-region text node after submit, in addition to being visible.
// ---------------------------------------------------------------------------

/** Minimum iOS/Android recommended touch target (pt). */
export const MIN_HIT_AREA = 44;

/**
 * hitSlop value that guarantees at least a 44×44 touch target around a visual
 * element of the given `visualSize` (in logical pixels), without changing the
 * layout. Returns `undefined` when the visual size is already ≥ 44 so callers
 * that size icons at 44px pay no extra hit area.
 */
export function hitSlopForIconSize(
  visualSize: number,
  opts?: { extra?: number }
): { top: number; right: number; bottom: number; left: number } | undefined {
  if (visualSize >= MIN_HIT_AREA) return undefined;
  const extra = opts?.extra ?? 0;
  const slack = Math.ceil((MIN_HIT_AREA - visualSize) / 2) + extra;
  return { top: slack, right: slack, bottom: slack, left: slack };
}

/** Compact alias used by icon-only actions across the codebase. */
export const hitSlop44 = (visualSize: number) => hitSlopForIconSize(visualSize);