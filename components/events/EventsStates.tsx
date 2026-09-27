// ---------------------------------------------------------------------------
// PULSE — Events async-state building blocks
//
// Small, pure presentation components implementing the standardized async UI
// state matrix for the Events vertical (list + detail). Kept separate from
// the screens so the matrix is unit-testable without mocking navigation,
// FlashList, or Supabase.
// ---------------------------------------------------------------------------
import { View } from "react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EventCardGridSkeleton, EventCardSkeleton } from "@/components/events/EventCardSkeleton";
import { Text as PulseText } from "@/components/ui/Text";
import { useTranslation } from "@/hooks/useTranslation";

export function EventsListSkeleton({ grid = false }: { grid?: boolean }) {
  const { t } = useTranslation();
  return (
    <View
      className={grid ? "px-4 flex-row flex-wrap" : "px-4"}
      testID="events-list-skeleton"
      accessible
      accessibilityLabel={t("common.loading")}
    >
      {Array.from({ length: grid ? 6 : 4 }).map((_, i) =>
        grid ? <EventCardGridSkeleton key={i} /> : <EventCardSkeleton key={i} />,
      )}
    </View>
  );
}

export function EventsListError({
  offline,
  onRetry,
  inline = false,
}: {
  offline: boolean;
  onRetry: () => void;
  inline?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <ErrorState
      testID={inline ? "events-list-inline-error-state" : "events-list-error"}
      title={t("events.list.loadErrorTitle")}
      message={offline ? t("events.list.offlineBody") : t("events.list.loadErrorBody")}
      onRetry={onRetry}
    />
  );
}

export function EventsListEmpty({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      testID="events-list-empty"
      icon="Calendar"
      title={t("events.list.emptyTitle")}
      subtitle={hasActiveFilters ? t("events.list.emptyHintFiltered") : t("events.list.emptyHintDefault")}
      ctaLabel={hasActiveFilters ? t("events.list.clearFilters") : undefined}
      onCta={hasActiveFilters ? onClearFilters : undefined}
    />
  );
}

export function EventsListRefreshing() {
  const { t } = useTranslation();
  return (
    <View
      className="px-4 py-1 flex-row items-center justify-center"
      testID="events-list-refreshing"
      accessible
      accessibilityLabel={t("events.list.refreshing")}
    >
      <LoadingSpinner size="small" accessibilityLabel={t("events.list.refreshing")} />
      <PulseText variant="caption" className="text-text-tertiary ml-1">
        {t("events.list.refreshing")}
      </PulseText>
    </View>
  );
}

export function EventsListFooterLoading() {
  const { t } = useTranslation();
  return (
    <View testID="events-list-footer-loading" accessible accessibilityLabel={t("events.list.loadingMore")}>
      <LoadingSpinner size="small" accessibilityLabel={t("events.list.loadingMore")} />
    </View>
  );
}
