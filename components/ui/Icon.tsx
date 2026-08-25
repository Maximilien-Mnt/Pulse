// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Icon
//
// Wraps Lucide icons with enforced design-token constraints:
//   - strokeWidth = 1.75
//   - size ∈ {16, 20, 24, 32}  (default 24)
//   - color always via semantic token, never a raw hex
//
// Active state: when `active` is true, fills the icon with the current
// color (simulating a "filled" variant) and uses the "primary" token.
//
// Usage:
//   <Icon name="Home" />                        // default: size 24, text-secondary
//   <Icon name="Heart" active={liked} />         // filled when liked
//   <Icon name="Search" size={20} />             // smaller
//   <Icon name="Bell" color="primary" />         // brand color
//   <Icon name="CheckCircle2" color="success" /> // semantic color
// ---------------------------------------------------------------------------

import React from "react";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";

// Lucide icon components — imported from the React Native package
import {
  Activity,
  Home,
  Search,
  PlusCircle,
  Plus,
  MessageCircle,
  User,
  UserCircle,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
  Calendar,
  Users,
  Bell,
  Settings,
  Flag,
  Pin,
  PinOff,
  Trash2,
  Image,
  FileText,
  Shield,
  AlertCircle,
  Info,
  ChevronLeft,
  Bug,
  PanelLeft,
  PanelBottom,
  LayoutGrid,
  List,
  X,
  Send,
  Sun,
  Lock,
  Moon,
  Globe,
  Eye,
  EyeOff,
  Mail,
  type LucideIcon,
} from "lucide-react-native";

// ---------------------------------------------------------------------------
// Icon name → component mapping
// ---------------------------------------------------------------------------

/**
 * All icons available in the Pulse design system.
 * Add new entries here when new icons are needed.
 */
export const ICON_MAP = {
  Activity,
  Home,
  Search,
  PlusCircle,
  Plus,
  MessageCircle,
  User,
  UserCircle,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
  Calendar,
  Users,
  Bell,
  Settings,
  Flag,
  Pin,
  PinOff,
  Trash2,
  Image,
  FileText,
  Shield,
  AlertCircle,
  Info,
  ChevronLeft,
  Bug,
  PanelLeft,
  PanelBottom,
  LayoutGrid,
  List,
  X,
  Send,
  Sun,
  Lock,
  Moon,
  Globe,
  Eye,
  EyeOff,
  Mail,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

// ---------------------------------------------------------------------------
// Allowed sizes
// ---------------------------------------------------------------------------

export type IconSize = 16 | 20 | 24 | 32;

// ---------------------------------------------------------------------------
// Semantic color tokens resolvable by the component
// ---------------------------------------------------------------------------

/**
 * Named color tokens accepted by the `color` prop.
 * These map to semantic design tokens from `useDesignTokens()`.
 */
export type IconColor =
  | "primary"
  | "primary-hover"
  | "primary-active"
  | "text-primary"
  | "text-secondary"
  | "text-tertiary"
  | "text-inverse"
  | "success"
  | "error-500"
  | "error-600"
  | "warning-500"
  | "accent";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconProps {
  /** Icon name from the Pulse icon set */
  name: IconName;
  /** Size in pixels. Allowed values: 16, 20, 24, 32. Default: 24. */
  size?: IconSize;
  /**
   * Semantic color token.
   * Default: "text-secondary" (neutral-600 light / #A7ACB5 dark).
   * When `active` is true, this is overridden to "primary".
   */
  color?: IconColor;
  /**
   * When true, the icon switches to its "active" visual state:
   * color → "primary", and fill is applied to simulate a filled variant.
   */
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Icon = React.memo<IconProps>(
  ({ name, size = 24, color = "text-secondary", active = false }) => {
    const tokens = useDesignTokens();

    // Resolve the effective color from semantic tokens
    const effectiveToken: IconColor = active ? "primary" : color;
    const resolvedColor = tokens.colors[effectiveToken];

    // Fill: when active, fill the icon with the same color (simulating filled variant)
    const fill = active ? resolvedColor : "none";

    // For React Native, we need to pass the color as a hex value
    const iconColorHex = typeof resolvedColor === 'string' ? resolvedColor : '#000000';

    const LucideComponent = ICON_MAP[name];

    return (
      <LucideComponent
        size={size}
        color={iconColorHex}
        fill={fill}
        strokeWidth={1.75}
        absoluteStrokeWidth
      />
    );
  }
);

Icon.displayName = "Icon";