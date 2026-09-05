// ---------------------------------------------------------------------------
// In-app navigation session tracking.
//
// React Navigation's `canGoBack()` on web can return `true` right after a
// hard refresh / deep-link entry because stale browser history survives the
// reload, even though the user did not actually navigate to this screen from
// a previous screen within this running app session.
//
// To distinguish "freshly loaded this session" from "navigated here from a
// previous screen", we keep a module-level flag. A full refresh (page reload /
// app restart) resets the module and therefore resets the flag to `false`.
// ---------------------------------------------------------------------------

let hasNavigated = false;

// Small in-app back stack keyed by the visited route path. Unlike the global
// flag above, this tracks *where* the user actually was so that detail pages
// (clubs, events, settings...) opened from different origins (profile, explore,
// a club list, a public profile...) can return to the exact previous screen.
// Because each tab group keeps its own React Navigation history, router.back()
// alone can pop to the wrong tab root or to no history at all after a refresh.
let backStack: string[] = [];

/**
 * Record a real navigation transition.
 * - `from` undefined means this is the first committed pathname (initial load /
 *   refresh / deep link): seed the stack with the current route.
 * - If the destination is already somewhere in the stack, the user is going
 *   "back" to it: truncate everything after it (LIFO pop).
 * - Otherwise push a new entry.
 */
export function recordRouteChange(from: string | undefined, to: string): void {
  if (from === undefined) {
    backStack = [to];
    return;
  }
  const existing = backStack.indexOf(to);
  if (existing > -1 && existing < backStack.length - 1) {
    backStack.length = existing + 1;
  } else if (backStack[backStack.length - 1] !== to) {
    backStack.push(to);
  }
}

/**
 * The screen the user was on right before the current one, if any in-session
 * navigation happened. Returns `undefined` when there is no deeper history
 * (e.g. the screen was deep-linked / freshly loaded), so callers fall back to
 * `router.back()` or their own `fallbackRoute`.
 */
export function getPreviousRoute(): string | undefined {
  if (backStack.length < 2) return undefined;
  return backStack[backStack.length - 2];
}

export function markNavigatedInSession(): void {
  hasNavigated = true;
}

export function hasNavigatedInSession(): boolean {
  return hasNavigated;
}