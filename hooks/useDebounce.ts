// ---------------------------------------------------------------------------
// PULSE — Debounce hooks
//
// Two complementary hooks:
//
// 1. `useDebounce(value, delay)` — value-based debounce. Returns the
//    debounced value, an `isSettled` flag, and a `flush()` that forces
//    immediate settlement (used for submit / clear-all actions).
//
// 2. `useDebouncedCallback(fn, delay)` — callback-based debounce. Returns a
//    stable `run` function, plus `flush()` and `cancel()`.
//
// Both clean up their timers on unmount to avoid state updates on unmounted
// components.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounces a value, returning the debounced version plus a settled flag.
 *
 * The `debouncedValue` only updates after `delay` ms of no changes to `value`.
 * Call `flush()` to force the debounced value to equal the current value
 * immediately (e.g. when the user presses "Search" / "Enter").
 *
 * @example
 * const { debouncedValue, isSettled, flush } = useDebounce(searchDraft, 300);
 * // query uses debouncedValue
 * // onSubmit → flush() → query refetches immediately
 */
export function useDebounce<T>(
  value: T,
  delay: number,
): {
  /** The debounced value — updates only after `delay` ms of stability. */
  debouncedValue: T;
  /** True once the debounce timer has completed (or on initial mount). */
  isSettled: boolean;
  /** Force `debouncedValue` to equal `value` right now, cancelling the timer. */
  flush: () => void;
  /** Cancel the pending timer without settling. */
  cancel: () => void;
} {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isSettled, setIsSettled] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to the latest value so flush() can read it synchronously.
  const valueRef = useRef(value);
  valueRef.current = value;

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDebouncedValue(valueRef.current);
    setIsSettled(true);
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIsSettled(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(valueRef.current);
      setIsSettled(true);
      timeoutRef.current = null;
    }, delay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [value, delay]);

  // Safety: clear timer on unmount.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { debouncedValue, isSettled, flush, cancel };
}
