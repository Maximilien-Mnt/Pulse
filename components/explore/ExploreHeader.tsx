// ---------------------------------------------------------------------------
// PULSE EXPLORE — Header (segment + search + expanding filter/sort panel)
// ---------------------------------------------------------------------------
// Header row: [Segment toggle] then [SearchBar] [Filter] [Sort] [View toggle]
//
// When filter/sort is tapped a NEW in-flow block opens directly below the row:
// full width, same grey as the buttons, pushing the list down so the panel can
// never hide behind other elements. Height follows the panel's own collapsible
// sections; the open button melts into the panel (no border, no gap).
// ---------------------------------------------------------------------------
import { View } from "react-native";
import { Pressable } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { SearchBar } from "@/components/shared/SearchBar";
import { t } from "@/hooks/useTranslation";
const PANEL_GREY = "bg-neutral-100 dark:bg-neutral-800";
export type ExploreHeaderTab = "clubs" | "events";
export type ExploreHeaderViewMode = "list" | "grid";
export type ExploreHeaderProps = {
  tab: ExploreHeaderTab;
  setTab: (t: ExploreHeaderTab) => void;
  search: string;
  setSearch: (s: string) => void;
  viewMode: ExploreHeaderViewMode;
  onToggleViewMode: () => void;
  isGridAvailable: boolean;
  onOpenFilterModal: () => void;
  filterActive: boolean;
  onOpenSort: () => void;
  sortActive: boolean;
  filterOpen: boolean;
  sortOpen: boolean;
  filterPanel?: ReactNode;
  sortPanel?: ReactNode;
};
export function ExploreHeader({
  tab,
  setTab,
  search,
  setSearch,
  viewMode,
  onToggleViewMode,
  isGridAvailable,
  onOpenFilterModal,
  filterActive,
  onOpenSort,
  sortActive,
  filterOpen,
  sortOpen,
  filterPanel,
  sortPanel,
}: ExploreHeaderProps) {
  const activePanel = filterOpen ? filterPanel : sortOpen ? sortPanel : null;
  const panelOpen = activePanel != null && (filterOpen || sortOpen);
  return (
    <View className="bg-bg dark:bg-bg-dark">
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row bg-neutral-50 dark:bg-neutral-800 rounded-full p-1">
          <Pressable
            onPress={() => setTab("clubs")}
            className={cn(
              "flex-1 items-center py-2.5 rounded-full",
              tab === "clubs" ? "bg-primary dark:bg-primary-dark" : "bg-transparent"
            )}
          >
            <Text
              variant="buttonLabel"
              className={tab === "clubs" ? "text-white" : "text-text-secondary"}
            >
              Clubs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("events")}
            className={cn(
              "flex-1 items-center py-2.5 rounded-full",
              tab === "events" ? "bg-primary dark:bg-primary-dark" : "bg-transparent"
            )}
          >
            <Text
              variant="buttonLabel"
              className={tab === "events" ? "text-white" : "text-text-secondary"}
            >
              {t("common.events")}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className="px-4 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch("")}
              expanded
              autoFocus={false}
              placeholder={
                tab === "clubs"
                  ? t("explore.searchClub")
                  : t("events.searchPlaceholder")
              }
            />
          </View>
          <View className="relative shrink-0">
            <PressableScale
              onPress={onOpenFilterModal}
              scaleOnPress={0.9}
              scaleOnHover={1.06}
              accessibilityRole="button"
              accessibilityLabel={t("explore.filtersSort")}
              className={cn(
                "relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150",
                "bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700"
              )}
            >
              <Icon
                name="ListFilter"
                size={20}
                color={filterActive ? "primary" : "text-secondary"}
              />
              {filterActive ? (
                <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              ) : null}
            </PressableScale>
            {filterOpen && panelOpen ? (
              <>
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800"
                  style={{ position: "absolute", top: 30, left: 8, right: 8, height: 31, zIndex: 10 }}
                />
                {/* Left fillet: grey quadrant tucked top-right, concave opening left. */}
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-bg dark:bg-bg-dark overflow-hidden"
                  style={{ position: "absolute", top: 39, left: 8, width: 12, height: 12, zIndex: 11 }}
                >
                  <View
                    aria-hidden
                    className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                    style={{ position: "absolute", left: 0, top: -12, width: 24, height: 24 }}
                  />
                </View>
                {/* Right fillet: mirrored, concave opening right. */}
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-bg dark:bg-bg-dark overflow-hidden"
                  style={{ position: "absolute", top: 39, left: 24, width: 12, height: 12, zIndex: 11 }}
                >
                  <View
                    aria-hidden
                    className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                    style={{ position: "absolute", left: -12, top: -12, width: 24, height: 24 }}
                  />
                </View>
              </>
            ) : null}
          </View>
          <View className="relative shrink-0">
            <PressableScale
              onPress={onOpenSort}
              scaleOnPress={0.9}
              scaleOnHover={1.06}
              accessibilityRole="button"
              accessibilityLabel={t("explore.sort")}
              className={cn(
                "relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150",
                "bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700"
              )}
            >
              <Icon
                name="ArrowUpDown"
                size={20}
                color={sortActive ? "primary" : "text-secondary"}
              />
              {sortActive ? (
                <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              ) : null}
            </PressableScale>
            {sortOpen && panelOpen ? (
              <>
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800"
                  style={{ position: "absolute", top: 30, left: 8, right: 8, height: 31, zIndex: 10 }}
                />
                {/* Left fillet: grey quadrant tucked top-right, concave opening left. */}
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-bg dark:bg-bg-dark overflow-hidden"
                  style={{ position: "absolute", top: 39, left: 8, width: 12, height: 12, zIndex: 11 }}
                >
                  <View
                    aria-hidden
                    className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                    style={{ position: "absolute", left: 0, top: -12, width: 24, height: 24 }}
                  />
                </View>
                {/* Right fillet: mirrored, concave opening right. */}
                <View
                  pointerEvents="none"
                  aria-hidden
                  className="bg-bg dark:bg-bg-dark overflow-hidden"
                  style={{ position: "absolute", top: 39, left: 24, width: 12, height: 12, zIndex: 11 }}
                >
                  <View
                    aria-hidden
                    className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                    style={{ position: "absolute", left: -12, top: -12, width: 24, height: 24 }}
                  />
                </View>
              </>
            ) : null}
          </View>
          {isGridAvailable ? (
            <IconButton
              icon={viewMode === "list" ? "LayoutGrid" : "List"}
              iconSize={20}
              size="md"
              tone="neutral"
              label={
                viewMode === "list" ? t("common.viewList") : t("common.viewGrid")
              }
              onPress={onToggleViewMode}
            />
          ) : null}
        </View>
      </View>
      {panelOpen ? (
        <View className="px-4 pb-2">
          <View className={cn("w-full overflow-hidden rounded-2xl", PANEL_GREY)}>{activePanel}</View>
        </View>
      ) : null}
    </View>
  );
}
