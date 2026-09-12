// ---------------------------------------------------------------------------
// PULSE — Accessibility Contract
// ---------------------------------------------------------------------------
// Central types and helpers for consistent accessibility behavior across all
// Pulse shared UI primitives. Import these in component props instead of
// scattering raw React Native accessibility props.
//
// Rules enforced by this contract:
//  - Icon-only actionable elements get a 44x44 minimum hit area via hitSlop
//    (does not change layout). Elements already >= 44x44 are left untouched.
//  - Disabled and pending states are exposed to assistive technology via
//    accessibilityState.disabled (and selected/checkbox/switch where relevant).
//  - Labels describe the action and current state, not just the element type.
//  - Modals use accessibilityViewIsModal + an accessible close button.
//  - Form errors are associated with their field and announced after submit
//    (accessibilityInvalid + live-region-style announcements where supported).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 44x44 hit area helpers
// ---------------------------------------------------------------------------

/** Minimum iOS/Android recommended touch target (pt). */
export const MIN_HIT_AREA = 44;

/** The four edge insets accepted by React Native's `hitSlop` prop. */
export type HitSlopInsets = { top: number; right: number; bottom: number; left: number };

/**
 * hitSlop that expands a smaller icon (e.g. 20-24px) to at least 44x44.
 *
 * For a 20px icon: top/right/bottom/left = 12 → 20 + 2*12 = 44.
 * For a 24px icon: top/right/bottom/left = 10 → 24 + 2*10 = 44.
 *
 * This does NOT change the visual layout — hitSlop only extends the
 * tappable region beyond the visible bounds.
 */
export const iconHitSlop44: HitSlopInsets = { top: 12, right: 12, bottom: 12, left: 12 };

/**
 * Returns a hitSlop that brings a small icon up to at least 44x44.
 * Pass the icon's visual size in pixels.
 */
export function hitSlopForIcon(sizePx: number): HitSlopInsets | undefined {
  if (sizePx >= MIN_HIT_AREA) return undefined;
  const slack = Math.ceil((MIN_HIT_AREA - sizePx) / 2);
  return { top: slack, right: slack, bottom: slack, left: slack };
}

// ---------------------------------------------------------------------------
// Common accessibility label strings (used directly or via t() in components)
// ---------------------------------------------------------------------------

/** Shared close-action label (also used via t("common.close") in i18n). */
export const CLOSE_LABEL = "Fermer";

/** Shared back-action label. */
export const BACK_LABEL = "Retour";

/** Shared cancel-action label. */
export const CANCEL_LABEL = "Annuler";

/** Shared save-action label. */
export const SAVE_LABEL = "Enregistrer";

/** Shared delete-action label. */
export const DELETE_LABEL = "Supprimer";

// ---------------------------------------------------------------------------
// Typed accessibility prop interfaces
// ---------------------------------------------------------------------------
// These are NOT meant to be merged into every component indiscriminately.
// Each primitive picks the interfaces that match its role. The goal is to
// make the contract explicit and typed rather than relying on raw props.

export interface AccessibilityLabelProps {
  /** Primary accessible name. When omitted, the component falls back to its
   *  visible text content or a sensible default. Required for icon-only
   *  actions and recommended for any element whose visible text is not
   *  self-describing. */
  accessibilityLabel?: string;
}

export interface AccessibilityHintProps {
  /** Secondary description of what happens when the element is activated,
   *  or what the element represents. Shown after the label by AT. */
  accessibilityHint?: string;
}

export interface AccessibilityStateProps {
  /** Exposes disabled/pending state to assistive technology. When a component
   *  is pending or disabled, set this to true so AT announces the state. */
  accessibilityStateDisabled?: boolean;
}

export interface AccessibilityValueProps {
  /** Exposes a numeric or textual value (e.g. like count, sort value) to AT
   *  via accessibilityValue. Useful when the visible value is not already part
   *  of the label. */
  accessibilityValue?: string;
}

/** Combined convenience type for icon-only actionable elements. */
export type IconActionAccessibilityProps = AccessibilityLabelProps &
  AccessibilityHintProps & {
    /** When true, this icon has no semantic meaning and should be ignored by
     *  AT (decorative). When false/omitted, the icon is informative and gets
     *  a role/label from the parent action. */
    decorative?: boolean;
  };

// ---------------------------------------------------------------------------
// Modal focus helpers
// ---------------------------------------------------------------------------

/** Props to set on the backdrop/pressable that closes a modal. */
export interface ModalCloseButtonProps {
  /** The accessible label for the close action. */
  closeLabel: string;
  /** Called when the backdrop is pressed. */
  onClose: () => void;
}

/**
 * When a Modal becomes visible, focus should move into it and the modal
 * should be announced. React Native's Modal + accessibilityViewIsModal on the
 * sheet container achieves this on iOS. On web, the same prop maps to
 * aria-modal.
 *
 * Apply `accessibilityViewIsModal` to the visible sheet content (not the
 * Modal wrapper itself).
 */
export const MODAL_ANNOUNCEMENT_PROPS = {
  accessibilityViewIsModal: true as const,
} as const;
