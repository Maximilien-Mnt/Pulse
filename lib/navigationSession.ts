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

export function markNavigatedInSession(): void {
  hasNavigated = true;
}

export function hasNavigatedInSession(): boolean {
  return hasNavigated;
}