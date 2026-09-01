// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Icon
//
// Wraps Lucide icons with enforced design-token constraints:
//   - strokeWidth = 1.75
//   - size ∈ {10, 12, 14, 15, 16, 18, 20, 22, 24, 28, 32, 40, 48} (default 24)
//   - color via semantic token, a raw hex (for per-sport brand colors),
//     or the explicit "white" token used on brand/dark surfaces
//
// Active state: when `active` is true, the icon switches to the "primary"
// token and is filled with the effective color (simulating a filled variant).
// Alternatively, `filled` fills the icon with the effective color while
// keeping the provided `color` token (used for things like star ratings).
//
// Usage:
//   <Icon name="Home" />                        // default: size 24, text-secondary
//   <Icon name="Heart" active={liked} />         // filled in primary when liked
//   <Icon name="Search" size={20} />             // smaller
//   <Icon name="Bell" color="primary" />         // brand color
//   <Icon name="CheckCircle2" color="success" /> // semantic color
//   <Icon name="Star" color="warning-500" filled /> // filled with its own color
//
// IMPORTANT (Pulse rule):
//   Always render icons through this component — never import icon-fonts
//   like `@expo/vector-icons`. Icon fonts rely on external .ttf assets that
//   can fail to load on web deployments (Cloudflare Pages) and render as
//   blank/colored squares. Lucide icons are inline SVG: zero fonts, zero
//   external requests, they can never break. When you need a new icon,
//   add its component to `ICON_MAP` below (and nothing else).
// ---------------------------------------------------------------------------

import React from "react";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";

// Lucide icon components — imported from the React Native package
import {
  Accessibility,
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bike,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  CirclePlay,
  CircleQuestionMark,
  CircleSmall,
  Clock,
  Disc,
  Dumbbell,
  Expand,
  Eye,
  EyeOff,
  Feather,
  FileText,
  Flag,
  Footprints,
  Funnel,
  Globe,
  Hand,
  Heart,
  Home,
  Image,
  Images,
  Info,
  LayoutGrid,
  List,
  ListFilter,
  Lock,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  MessageSquare,
  Moon,
  Mountain,
  Music,
  PanelBottom,
  PanelLeft,
  Pen,
  PersonStanding,
  Pin,
  PinOff,
  Plus,
  PlusCircle,
  Sailboat,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Star,
  Sun,
  Swords,
  Tag,
  Target,
  Trash2,
  Trophy,
  User,
  UserCircle,
  UserPlus,
  Users,
  Volleyball,
  Volume2,
  VolumeX,
  Waves,
  X,
  XCircle,
  Zap,
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
  Accessibility,
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bike,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  CirclePlay,
  CircleQuestionMark,
  CircleSmall,
  Clock,
  Disc,
  Dumbbell,
  Expand,
  Eye,
  EyeOff,
  Feather,
  FileText,
  Flag,
  Footprints,
  Funnel,
  Globe,
  Hand,
  Heart,
  Home,
  Image,
  Images,
  Info,
  LayoutGrid,
  List,
  ListFilter,
  Lock,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  MessageSquare,
  Moon,
  Mountain,
  Music,
  PanelBottom,
  PanelLeft,
  Pen,
  PersonStanding,
  Pin,
  PinOff,
  Plus,
  PlusCircle,
  Sailboat,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Star,
  Sun,
  Swords,
  Tag,
  Target,
  Trash2,
  Trophy,
  User,
  UserCircle,
  UserPlus,
  Users,
  Volleyball,
  Volume2,
  VolumeX,
  Waves,
  X,
  XCircle,
  Zap,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

// ---------------------------------------------------------------------------
// Allowed sizes
// ---------------------------------------------------------------------------

export type IconSize =
  | 10
  | 12
  | 14
  | 15
  | 16
  | 18
  | 20
  | 22
  | 24
  | 28
  | 32
  | 40
  | 48;

// ---------------------------------------------------------------------------
// Semantic color tokens resolvable by the component
// ---------------------------------------------------------------------------

/**
 * Named color tokens accepted by the `color` prop.
 * These map to semantic design tokens from `useDesignTokens()`.
 *
 * A raw hex string (e.g. `"#16A34A"`) is also allowed and passed through
 * unchanged — used mainly for per-sport brand colors in sport badges.
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
  | "accent"
  | "white"
  | (string & {});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconProps {
  /** Icon name from the Pulse icon set */
  name: IconName;
  /**
   * Size in pixels. Prefer the standard set in `IconSize`
   * (10, 12, 14, 15, 16, 18, 20, 22, 24, 28, 32, 40, 48). Default: 24.
   * Any number is accepted so dynamic sizes (e.g. Avatar rest scaling) work.
   */
  size?: number;
  /**
   * Semantic color token, or a raw hex string (used for per-sport colors).
   * Default: "text-secondary" (neutral-600 light / #A7ACB5 dark).
   * When `active` is true, this is overridden to "primary".
   */
  color?: IconColor;
  /**
   * When true, the icon switches to its "active" visual state:
   * color → "primary", and fill is applied to simulate a filled variant.
   */
  active?: boolean;
  /**
   * When true, the icon is filled with the effective `color` (stroke color).
   * Unlike `active`, it does not override the color to "primary" — useful
   * for things like filled star ratings (`color="warning-500" filled`).
   */
  filled?: boolean;
  /** Optional NativeWind class name forwarded to the underlying SVG. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Icon = React.memo<IconProps>(
  ({ name, size = 24, color = "text-secondary", active = false, filled = false, ...rest }) => {
    const tokens = useDesignTokens();

    // Resolve the effective color: semantic token → hex, raw hex → passthrough
    const effectiveColor: string = active ? "primary" : color;
    const resolvedColor =
      effectiveColor === "white"
        ? "#FFFFFF"
        : effectiveColor in tokens.colors
          ? tokens.colors[effectiveColor as keyof typeof tokens.colors]
          : effectiveColor;

    // Fill: when active/filled, fill the icon with the same color
    // (simulating a filled variant)
    const useFill = active || filled;
    const fill = useFill ? resolvedColor : "none";

    // For React Native, we need to pass the color as a hex value
    const iconColorHex = typeof resolvedColor === "string" ? resolvedColor : "#000000";

    const LucideComponent = ICON_MAP[name] ?? Info;

    return (
      <LucideComponent
        size={size}
        color={iconColorHex}
        fill={fill}
        strokeWidth={1.75}
        absoluteStrokeWidth
        {...rest}
      />
    );
  }
);

Icon.displayName = "Icon";