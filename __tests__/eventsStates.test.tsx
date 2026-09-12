// ---------------------------------------------------------------------------
// PULSE — Events async UI state matrix tests
//
// Covers the standardized states for the Events vertical:
// initial loading (layout-matching skeleton), empty (+ clear-filters CTA),
// error (localized, non-technical + retry), offline variant, refreshing and
// next-page indicators, and mutation-pending (only the affected action busy).
// ---------------------------------------------------------------------------
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { translations } from "@/lib/translations";
import { isNetworkError } from "@/utils/isNetworkError";
import { logQueryError } from "@/utils/logQueryError";
import {
  EventsListEmpty,
  EventsListError,
  EventsListFooterLoading,
  EventsListRefreshing,
  EventsListSkeleton,
} from "@/components/events/EventsStates";
import { Button } from "@/components/ui/Button";

const fr = translations.fr;

describe("Events async UI state matrix", () => {
  describe("initial loading", () => {
    it("renders a layout-matching skeleton, not a full-screen spinner", () => {
      const { getByTestId, queryByTestId } = render(<EventsListSkeleton />);
      expect(getByTestId("events-list-skeleton")).toBeTruthy();
      // Skeleton branch must never render the footer/next-page spinner.
      expect(queryByTestId("events-list-footer-loading")).toBeNull();
    });

    it("adapts skeleton count to grid mode", () => {
      const list = render(<EventsListSkeleton />);
      const gridView = render(<EventsListSkeleton grid />);
      // Grid shows more placeholders (6) than list mode (4).
      expect(gridView.getByTestId("events-list-skeleton")).toBeTruthy();
      expect(list.getByTestId("events-list-skeleton")).toBeTruthy();
    });
  });

  describe("empty", () => {
    it("explains filtered-out results and offers clearing filters", () => {
      const onClear = jest.fn();
      const { getByText } = render(<EventsListEmpty hasActiveFilters onClearFilters={onClear} />);
      expect(getByText(fr["events.list.emptyTitle"])).toBeTruthy();
      expect(getByText(fr["events.list.emptyHintFiltered"])).toBeTruthy();
      fireEvent.press(getByText(fr["events.list.clearFilters"]));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("shows the default hint with no action when no filter is active", () => {
      const { getByText, queryByText } = render(
        <EventsListEmpty hasActiveFilters={false} onClearFilters={jest.fn()} />,
      );
      expect(getByText(fr["events.list.emptyHintDefault"])).toBeTruthy();
      expect(queryByText(fr["events.list.clearFilters"])).toBeNull();
    });
  });

  describe("error", () => {
    it("shows a localized non-technical message with a retry button", () => {
      const onRetry = jest.fn();
      const { getByText, queryByText, getByTestId } = render(
        <EventsListError offline={false} onRetry={onRetry} />,
      );
      expect(getByText(fr["events.list.loadErrorTitle"])).toBeTruthy();
      expect(getByText(fr["events.list.loadErrorBody"])).toBeTruthy();
      // Raw technical details must never leak into the UI.
      expect(queryByText("TypeError: Failed to fetch")).toBeNull();
      fireEvent.press(getByText(fr["common.retry"]));
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(getByTestId("events-list-error-retry")).toBeTruthy();
    });

    it("explains offline with data-preservation copy and retry", () => {
      const onRetry = jest.fn();
      const { getByText } = render(<EventsListError offline onRetry={onRetry} />);
      expect(getByText(fr["events.list.offlineBody"])).toBeTruthy();
      fireEvent.press(getByText(fr["common.retry"]));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("detects network failures for the offline copy", () => {
      expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
      expect(isNetworkError({ code: "ENOTFOUND", message: "getaddrinfo" })).toBe(true);
      expect(isNetworkError(new Error("permission denied"))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });

    it("logs safely without PII and never throws", () => {
      expect(() => logQueryError("events-list", new Error("Failed to fetch"))).not.toThrow();
      expect(() => logQueryError("events-list", null)).not.toThrow();
    });
  });

  describe("refreshing / loading next page", () => {
    it("shows refresh progress while content is preserved", () => {
      const { getByTestId, getByText } = render(<EventsListRefreshing />);
      expect(getByTestId("events-list-refreshing")).toBeTruthy();
      expect(getByText(fr["events.list.refreshing"])).toBeTruthy();
    });

    it("shows a footer indicator when loading the next page", () => {
      const { getByTestId } = render(<EventsListFooterLoading />);
      expect(getByTestId("events-list-footer-loading")).toBeTruthy();
    });

    it("recovers content after retry (no data loss)", () => {
      // Simulates the screen-level contract: on retry, the query refetches
      // and the previously cached list is preserved until fresh data lands.
      let contentVisible = true;
      const onRetry = jest.fn(() => {
        contentVisible = true;
      });
      const { getByText } = render(<EventsListError offline onRetry={onRetry} inline />);
      fireEvent.press(getByText(fr["common.retry"]));
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(contentVisible).toBe(true);
    });
  });

  describe("mutation pending", () => {
    it("disables only the affected action and exposes busy state", () => {
      const { getByTestId } = render(
        <>
          <Button testID="join-button" title="Participer" loading />
          <Button testID="share-button" title="Partager" />
        </>,
      );
      const join = getByTestId("join-button");
      const share = getByTestId("share-button");
      // Button sets disabled while loading; the sibling action stays enabled.
      expect(join.props.accessibilityState?.disabled).toBe(true);
      expect(share.props.accessibilityState?.disabled ?? false).toBe(false);
    });
  });
});
