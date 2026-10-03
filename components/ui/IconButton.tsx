// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — IconButton
//
// The canonical icon-only button. Every circular icon action in the app
// (settings, delete, edit, share, filter, "new club event", close, accept,
// refuse, …) should render through this component so the micro-interaction is
// identical everywhere. It is the icon-only sibling of <Button>.
//
// Design (borrowed from the most considered implementation in the codebase,
// components/explore/CoverOverlayActions.tsx):
//   - Hover/focus: the surface LIFTS to the exact colour of its pressed state,
//     so hover and press read as one continuous control rather than two
//     separate affordances. The swap is a 150ms `transition-colors` fade — the
//     same duration as MessageBubble and the arrow nudge. We deliberately do
//     NOT use Tailwind `hover:` variants here: the repo convention is a JS
//     `hovered` state + class swap (CoverOverlayActions / MessageBubble), which
//     is also what the tests assert against.
//   - Hover/focus: a spring scale-up (1.06). Keyboard focus gets the same
//     treatment as pointer hover, so the affordance is never mouse-only.
//   - Press: a spring scale-down (0.9) — tactile feedback on tap/click.
//   - Everything is gated by `useReducedMotion`: under reduced motion the states
//     still change, they just snap instead of animating.
//
// Usage:
//   <IconButton icon="Settings" label={t("clubs.edit")} onPress={open} />
//   <IconButton icon="Trash2" tone="danger" size="sm" label={…} onPress={del} />
//   <IconButton icon="Heart" active={liked} label={…} onPress={toggle} />
//
// A11y: `label` is required (an icon-only button has no visible text), the role
// is always "button", and the tap target is expanded to the 44x44 minimum via
// hitSlop without disturbing layout.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, type PressableProps } from "react-native";

import { Icon, type IconColor, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";
import { hitSlopForIcon } from "@/src/accessibility";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Timing constants — the shared motion language
// ---------------------------------------------------------------------------

/** Standard size (px) for every round icon button in the app — all circular buttons share this dimension. */
export const BUTTON_ICON_SIZE = 44;
/** Scale applied while hovered / keyboard-focused. */
export const ICON_BUTTON_SCALE_HOVER = 1.06;
/** Scale applied while pressed. */
export const ICON_BUTTON_SCALE_PRESS = 0.9;
/** Duration (ms) of the surface colour fade. Matches ARROW_NUDGE_DURATION. */
export const ICON_BUTTON_TRANSITION_MS = 150;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconButtonTone = "primary" | "neutral" | "danger" | "solid" | "dangerSolid";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  /** Lucide icon from the Pulse icon set (always rendered through <Icon>). */
  icon: IconName;
  /** Required accessible name — an icon-only button has no visible text. */
  label: string;
  /** Optional hint describing what activating it does. */
  hint?: string;
  onPress?: () => void;
  /** Semantic colour family. Default "primary". */
  tone?: IconButtonTone;
  /** Control size. Default "md". */
  size?: IconButtonSize;
  /** Icon size in px. Defaults to a sensible value per size. */
  iconSize?: number;
  /** Overrides the tone's icon colour token (e.g. "white" on a photo overlay). */
  color?: IconColor;
  /** Selected / toggled-on state (e.g. a liked heart). */
  active?: boolean;
  /** Fills the glyph when `active` (e.g. a filled heart). */
  filled?: boolean;
  disabled?: boolean;
  /** Extra classes merged last — use for positioning, not for colour. */
  className?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}
// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

/** Box dimensions per size. `sm` still reaches a 44px target via hitSlop. */
const sizeBox: Record<IconButtonSize, string> = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-12 h-12",
};

/** Visual box edge in px, used to compute the 44px-minimum hitSlop. */
const sizePx: Record<IconButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 48,
};

/** Icon size in px per size preset. */
const sizeIcon: Record<IconButtonSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Resting surface, and the "lifted" surface reached on hover/focus and while
 * selected. `toneHover` is intentionally the same colour sequence as the
 * resting `active:` state, so crossing the button with the pointer and then
 * pressing it read as one continuous gesture rather than two affordances.
 */
const toneRest: Record<IconButtonTone, string> = {
  primary: "bg-primary/10 dark:bg-primary-dark/15",
  neutral: "bg-neutral-100 dark:bg-neutral-800",
  danger: "bg-error-500/10 dark:bg-error-dark/15",
  solid: "bg-primary dark:bg-primary-dark",
  dangerSolid: "bg-error-600 dark:bg-error-dark",
};

const toneHover: Record<IconButtonTone, string> = {
  primary: "bg-primary/20 dark:bg-primary-dark/25",
  neutral: "bg-neutral-200 dark:bg-neutral-700",
  danger: "bg-error-500/20 dark:bg-error-dark/25",
  solid: "bg-primary-hover dark:bg-primary-hover-dark",
  dangerSolid: "bg-error-600/85 dark:bg-error-dark/85",
};

/** Icon colour token per tone. */
const toneIcon: Record<IconButtonTone, IconColor> = {
  primary: "primary",
  neutral: "text-secondary",
  danger: "error-500",
  solid: "white",
  dangerSolid: "white",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IconButton({
  icon,
  label,
  hint,
  onPress,
  tone = "primary",
  size = "md",
  iconSize,
  color,
  active = false,
  filled = false,
  disabled = false,
  className,
  testID,
  onFocus,
  onBlur,
  ...rest
}: IconButtonProps) {
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);

  // ── Hover / focus state ─────────────────────────────────────────────
  // Hover is a pointer concept (web only), but keyboard focus gets the same
  // affordance on every platform — the animation must never be mouse-only.
  // This mirrors useArrowNudge (components/ui/Arrow.tsx) so the two agree on
  // when an icon control is "engaged".
  const setTo = useCallback(
    (next: boolean) => {
      const value = !disabled && next;
      if (hoveredRef.current === value) return;
      hoveredRef.current = value;
      setHovered(value);
    },
    [disabled]
  );

  // A button that becomes disabled while hovered/focused releases the state,
  // otherwise it would stay stuck in its lifted colour.
  useEffect(() => {
    if (disabled && hoveredRef.current) {
      hoveredRef.current = false;
      setHovered(false);
    }
  }, [disabled]);

  const isWeb = Platform.OS === "web";

  // ── Classes ─────────────────────────────────────────────────────────
  // `active` (a selected toggle) renders the lifted surface too, so a selected
  // state is visible without hover and reads as "already engaged".
  const lifted = hovered || active;

  const containerClass = cn(
    "rounded-full items-center justify-center shrink-0",
    // The colour fade that turns the surface swap into an animation.
    "transition-colors",
    `duration-${ICON_BUTTON_TRANSITION_MS}`,
    sizeBox[size],
    toneRest[tone],
    lifted && toneHover[tone],
    disabled && "opacity-50",
    className
  );

  return (
    <PressableScale
      {...rest}
      onPress={onPress}
      disabled={disabled}
      // Springs come from PressableScale, which already respects
      // prefers-reduced-motion for us.
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      // PressableScale only wires hover on web; focus/blur are platform-agnostic
      // so the keyboard path works on native too.
      onHoverIn={isWeb ? setTo.bind(null, true) : undefined}
      onHoverOut={isWeb ? setTo.bind(null, false) : undefined}
      onFocus={(e) => {
        setTo(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setTo(false);
        onBlur?.(e);
      }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected: active }}
      // Expand a smaller button to the 44x44 minimum without changing layout.
      hitSlop={hitSlopForIcon(sizePx[size])}
      className={containerClass}
    >
      <Icon
        name={icon}
        size={iconSize ?? sizeIcon[size]}
        color={color ?? toneIcon[tone]}
        active={active}
        filled={filled}
        decorative
      />
    </PressableScale>
  );
}