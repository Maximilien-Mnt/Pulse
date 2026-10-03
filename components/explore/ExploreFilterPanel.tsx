// ---------------------------------------------------------------------------
// PULSE EXPLORE — Inline filter panel
//
// Renders the explore filters *inline*, right under the header (segment +
// search + buttons) and above the clubs/events list — no modal, no Apply
// button. Every change is pushed to the parent immediately; the parent
// debounces the network query, so the list refreshes a beat after each
// interaction while the UI stays instant.
//
// Anatomy:
//   - header   → title, active count, reset, collapse chevron
//   - pills    → every active filter as a pill; tapping it unselects it
//   - sections → independently collapsible groups (sports, level, dates…),
//                several may stay open at once
//   - content  → scrollable, the panel itself has a capped height
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import type { IconName } from "@/components/ui/Icon";
import { SPORTS, FALLBACK_LEVELS } from "@/lib/constants";
import { getSportLabel } from "@/lib/i18n";
import type { ClubListFilters } from "@/hooks/useClubs";
import type { EventListFilters } from "@/hooks/useEvents";
import { getIntlLocale } from "@/lib/locale";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

export type ExploreFilterTab = "clubs" | "events";

/** Short, locale-aware day label used by the date fields and their pills. */
function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(getIntlLocale(), {
      day: "2-digit",
      month: "short",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

/** A toggle button. Pressing an already-selected one untoggles it. */
function ToggleButton({
  label,
  icon,
  active,
  onPress,
  testID,
}: {
  label: string;
  icon?: IconName;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "flex-row items-center gap-1.5 px-3 py-2 rounded-full border active:opacity-80",
        active
          ? "bg-primary border-primary"
          : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
      )}
    >
      {icon ? (
        <Icon name={icon} size={14} color={active ? "#FFFFFF" : "text-tertiary"} />
      ) : null}
      <Text
        variant="caption"
        className={
          active ? "text-white" : "text-text-secondary dark:text-text-secondary-dark"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Text field revealing a cross icon as soon as it holds a value. */
function ClearableInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
  testID?: string;
}) {
  return (
    <View className="relative">
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className={cn(
          "h-11 rounded-full border-[1.5px] border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 font-inter text-base text-text-primary dark:text-text-primary-dark",
          value ? "pr-11" : "pr-4"
        )}
      />
      {value ? (
        <Pressable
          testID={testID ? `${testID}-clear` : undefined}
          onPress={() => onChangeText("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel} — clear`}
          className="absolute right-1 top-0 bottom-0 justify-center px-2 rounded-full active:opacity-60"
        >
          <Icon name="X" size={16} color="text-tertiary" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** One collapsible section: title row + chevron, content only when expanded. */
function FilterSection({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  /** Count of selected values, shown next to the title. */
  badge?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <View className="border-b border-border dark:border-border-dark">
      <Pressable
        testID={`filter-section-${id}`}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        className="flex-row items-center justify-between py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text
            variant="caption"
            className={
              open
                ? "text-text-primary"
                : "text-text-secondary dark:text-text-secondary-dark"
            }
          >
            {title}
          </Text>
          {badge && badge > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text variant="caption" className="text-white text-[11px] leading-[18px]">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Chevron direction mirrors the section state */}
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color="text-tertiary" />
      </Pressable>

      {/* Content is only mounted while the section is expanded */}
      {open ? <View className="pb-3">{children}</View> : null}
    </View>
  );
}

/** Date field with a native picker and a cross to clear it. */
function DateField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1 min-w-[140px]">
      <Text variant="caption" className="text-text-tertiary mb-1.5">
        {label}
      </Text>
      <View className="flex-row items-center gap-1">
        <Pressable
          testID={testID}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
          className={cn(
            "flex-1 h-11 justify-center px-3 rounded-full border-[1.5px] bg-surface dark:bg-surface-dark",
            value ? "border-primary" : "border-border dark:border-border-dark"
          )}
        >
          <Text
            variant="caption"
            numberOfLines={1}
            className={value ? "text-text-primary" : "text-text-tertiary"}
          >
            {value ? formatDay(value) : t("events.filters.choose")}
          </Text>
        </Pressable>
        {value ? (
          <IconButton
            testID={testID ? `${testID}-clear` : undefined}
            icon="X"
            iconSize={16}
            size="sm"
            tone="neutral"
            color="text-tertiary"
            label={`${label} — clear`}
            onPress={() => onChange(null)}
          />
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, d) => {
            setOpen(Platform.OS === "ios");
            if (d) onChange(d.toISOString());
          }}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active filter pills
// ---------------------------------------------------------------------------

type Pill = { id: string; label: string };

type PillLabels = {
  internal: string;
  external: string;
  favorites: string;
  paid: string;
  free: string;
};

function buildClubPills(f: ClubListFilters, L: PillLabels): Pill[] {
  const pills: Pill[] = f.sports.map((id) => ({
    id: `sport:${id}`,
    label: getSportLabel(id),
  }));
  if (f.location.trim()) pills.push({ id: "location", label: f.location.trim() });
  if (f.requiredLevel.trim()) pills.push({ id: "level", label: f.requiredLevel.trim() });
  if (f.internalOnly) pills.push({ id: "internal", label: L.internal });
  if (f.externalOnly) pills.push({ id: "external", label: L.external });
  if (f.favoritesOnly) pills.push({ id: "favorites", label: L.favorites });
  return pills;
}

function buildEventPills(f: EventListFilters, L: PillLabels): Pill[] {
  const pills: Pill[] = f.sports.map((id) => ({
    id: `sport:${id}`,
    label: getSportLabel(id),
  }));
  if (f.location.trim()) pills.push({ id: "location", label: f.location.trim() });
  if (f.dateFrom) pills.push({ id: "dateFrom", label: `≥ ${formatDay(f.dateFrom)}` });
  if (f.dateTo) pills.push({ id: "dateTo", label: `≤ ${formatDay(f.dateTo)}` });
  if (f.paidOnly === true) pills.push({ id: "paid", label: L.paid });
  if (f.paidOnly === false) pills.push({ id: "free", label: L.free });
  if (f.internalOnly) pills.push({ id: "internal", label: L.internal });
  if (f.externalOnly) pills.push({ id: "external", label: L.external });
  if (f.favoritesOnly) pills.push({ id: "favorites", label: L.favorites });
  return pills;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

type Props = {
  tab: ExploreFilterTab;
  clubFilters: ClubListFilters;
  eventFilters: EventListFilters;
  onChangeClubFilters: (v: ClubListFilters) => void;
  onChangeEventFilters: (v: EventListFilters) => void;
  onClose: () => void;
};

export function ExploreFilterPanel({
  tab,
  clubFilters,
  eventFilters,
  onChangeClubFilters,
  onChangeEventFilters,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  // Capped height: the panel never takes more than ~46% of the screen (and
  // never more than 380dp), so the list underneath stays visible. The section
  // area scrolls whenever the content doesn't fit.
  const maxHeight = Math.min(height * 0.46, 380);

  const isClubs = tab === "clubs";
  const filters = isClubs ? clubFilters : eventFilters;

  const pillLabels = useMemo<PillLabels>(
    () => ({
      internal: t("events.filters.internalOnly"),
      external: t("events.filters.externalOnly"),
      favorites: t("events.filters.favoritesOnly"),
      paid: t("events.filters.paidOnly"),
      free: t("events.filters.freeOnly"),
    }),
    [t]
  );

  const pills = useMemo(
    () =>
      isClubs
        ? buildClubPills(clubFilters, pillLabels)
        : buildEventPills(eventFilters, pillLabels),
    [isClubs, clubFilters, eventFilters, pillLabels]
  );

  const setClub = useCallback(
    (patch: Partial<ClubListFilters>) => onChangeClubFilters({ ...clubFilters, ...patch }),
    [clubFilters, onChangeClubFilters]
  );
  const setEvent = useCallback(
    (patch: Partial<EventListFilters>) => onChangeEventFilters({ ...eventFilters, ...patch }),
    [eventFilters, onChangeEventFilters]
  );

  const toggleSport = useCallback(
    (id: string) => {
      const current = filters.sports;
      const next = current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id];
      if (isClubs) setClub({ sports: next });
      else setEvent({ sports: next });
    },
    [filters.sports, isClubs, setClub, setEvent]
  );

/** Tapping a pill removes exactly that filter. */
  const removePill = useCallback(
    (id: string) => {
      if (id.startsWith("sport:")) {
        toggleSport(id.slice("sport:".length));
        return;
      }
      switch (id) {
        case "location":
          if (isClubs) setClub({ location: "" });
          else setEvent({ location: "" });
          break;
        case "level":
          setClub({ requiredLevel: "" });
          break;
        case "dateFrom":
          setEvent({ dateFrom: null });
          break;
        case "dateTo":
          setEvent({ dateTo: null });
          break;
        case "paid":
        case "free":
          setEvent({ paidOnly: null });
          break;
        case "internal":
          if (isClubs) setClub({ internalOnly: false });
          else setEvent({ internalOnly: false });
          break;
        case "external":
          if (isClubs) setClub({ externalOnly: false });
          else setEvent({ externalOnly: false });
          break;
        case "favorites":
          if (isClubs) setClub({ favoritesOnly: false });
          else setEvent({ favoritesOnly: false });
          break;
        default:
          break;
      }
    },
    [isClubs, setClub, setEvent, toggleSport]
  );

  const clearAll = useCallback(() => {
    if (isClubs) {
      onChangeClubFilters({
        sports: [],
        location: "",
        requiredLevel: "",
        internalOnly: false,
        externalOnly: false,
        favoritesOnly: false,
        // Sorting & radius stay under the "sort" button's control.
        sort: clubFilters.sort,
        radiusKm: clubFilters.radiusKm ?? 10,
      });
    } else {
      onChangeEventFilters({
        sports: [],
        location: "",
        dateFrom: null,
        dateTo: null,
        paidOnly: null,
        internalOnly: false,
        externalOnly: false,
        favoritesOnly: false,
        sort: eventFilters.sort,
        radiusKm: eventFilters.radiusKm ?? 10,
      });
    }
  }, [
    isClubs,
    clubFilters.sort,
    clubFilters.radiusKm,
    eventFilters.sort,
    eventFilters.radiusKm,
    onChangeClubFilters,
    onChangeEventFilters,
  ]);

  const locationValue = isClubs ? clubFilters.location : eventFilters.location;
  const typeBadge =
    (isClubs
      ? Number(clubFilters.internalOnly) +
        Number(clubFilters.externalOnly) +
        Number(clubFilters.favoritesOnly)
      : Number(eventFilters.internalOnly) +
        Number(eventFilters.externalOnly) +
        Number(eventFilters.favoritesOnly)) || 0;

return (
    <View
      testID="explore-filter-panel"
      style={{ maxHeight }}
      className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark"
    >
      {/* ── Panel header ─────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text variant="caption" className="text-text-primary">
            {t("explore.filtersSort")}
          </Text>
          {pills.length > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text variant="caption" className="text-white text-[11px] leading-[18px]">
                {pills.length}
              </Text>
            </View>
          ) : null}
        </View>
        {pills.length > 0 ? (
          <Pressable
            testID="explore-filter-clear-all"
            onPress={clearAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("explore.clearAllFilters")}
            className="px-2 py-1 rounded-full active:opacity-60"
          >
            <Text variant="caption" className="text-primary">
              {t("common.reset")}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="explore-filter-collapse"
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("explore.filtersSort")}
          className="pl-2 py-1 rounded-full active:opacity-60"
        >
          <Icon name="ChevronUp" size={18} color="text-tertiary" />
        </Pressable>
      </View>

      {/* ── Active filter pills (tap to unselect) ─────────────────────── */}
      {pills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}
        >
          {pills.map((p) => (
            <Pressable
              key={p.id}
              testID={`filter-pill-${p.id}`}
              onPress={() => removePill(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`${p.label} — ${t("common.reset")}`}
              className="flex-row items-center gap-1 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 active:opacity-70"
            >
              <Text variant="caption" className="text-primary">
                {p.label}
              </Text>
              <Icon name="X" size={13} color="primary" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* ── Collapsible sections (scrollable when they overflow) ──────── */}
      <ScrollView
        testID="explore-filter-sections"
        style={{ maxHeight: maxHeight - (pills.length > 0 ? 104 : 60) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >

{/* Sports */}
        <FilterSection
          id="sports"
          title={t("events.filters.sports")}
          badge={filters.sports.length}
        >
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <ToggleButton
                key={s.id}
                testID={`filter-sport-${s.id}`}
                label={getSportLabel(s.id)}
                icon={s.icon}
                active={filters.sports.includes(s.id)}
                onPress={() => toggleSport(s.id)}
              />
            ))}
          </View>
        </FilterSection>

        {/* Required level (clubs only) */}
        {isClubs ? (
          <FilterSection
            id="level"
            title={t("clubs.filters.levelExact")}
            badge={clubFilters.requiredLevel.trim() ? 1 : 0}
          >
            <View className="flex-row flex-wrap gap-2">
              {FALLBACK_LEVELS.map((level) => (
                <ToggleButton
                  key={level}
                  testID={`filter-level-${level}`}
                  label={level}
                  active={clubFilters.requiredLevel === level}
                  onPress={() =>
                    setClub({
                      requiredLevel:
                        clubFilters.requiredLevel === level ? "" : level,
                    })
                  }
                />
              ))}
            </View>
          </FilterSection>
        ) : null}

{/* Dates (events only) */}
        {!isClubs ? (
          <FilterSection
            id="dates"
            title={t("explore.filters.dates")}
            badge={(eventFilters.dateFrom ? 1 : 0) + (eventFilters.dateTo ? 1 : 0)}
          >
            <View className="flex-row flex-wrap gap-3">
              <DateField
                testID="filter-date-from"
                label={t("events.filters.dateStart")}
                value={eventFilters.dateFrom}
                onChange={(v) => setEvent({ dateFrom: v })}
              />
              <DateField
                testID="filter-date-to"
                label={t("events.filters.dateEnd")}
                value={eventFilters.dateTo}
                onChange={(v) => setEvent({ dateTo: v })}
              />
            </View>
          </FilterSection>
        ) : null}

        {/* Price (events only) */}
        {!isClubs ? (
          <FilterSection
            id="price"
            title={t("explore.filters.price")}
            badge={eventFilters.paidOnly === null ? 0 : 1}
          >
            <View className="flex-row flex-wrap gap-2">
              <ToggleButton
                testID="filter-paid"
                label={t("events.filters.paidOnly")}
                active={eventFilters.paidOnly === true}
                onPress={() =>
                  setEvent({ paidOnly: eventFilters.paidOnly === true ? null : true })
                }
              />
              <ToggleButton
                testID="filter-free"
                label={t("events.filters.freeOnly")}
                active={eventFilters.paidOnly === false}
                onPress={() =>
                  setEvent({ paidOnly: eventFilters.paidOnly === false ? null : false })
                }
              />
            </View>
          </FilterSection>
        ) : null}

{/* Location (text field with a clear cross) */}
        <FilterSection
          id="location"
          title={t("clubs.filters.location")}
          badge={locationValue.trim() ? 1 : 0}
        >
          <ClearableInput
            testID="filter-location"
            value={locationValue}
            onChangeText={(v) =>
              isClubs ? setClub({ location: v }) : setEvent({ location: v })
            }
            placeholder="Ex. Luxembourg"
            accessibilityLabel={t("clubs.filters.location")}
          />
        </FilterSection>

        {/* Type (internal / external / favorites) */}
        <FilterSection id="type" title={t("explore.filters.type")} badge={typeBadge}>
          <View className="flex-row flex-wrap gap-2">
            <ToggleButton
              testID="filter-internal"
              label={t("events.filters.internalOnly")}
              active={filters.internalOnly}
              onPress={() =>
                isClubs
                  ? setClub({
                      internalOnly: !clubFilters.internalOnly,
                      externalOnly: false,
                    })
                  : setEvent({
                      internalOnly: !eventFilters.internalOnly,
                      externalOnly: false,
                    })
              }
            />
            <ToggleButton
              testID="filter-external"
              label={t("events.filters.externalOnly")}
              active={filters.externalOnly}
              onPress={() =>
                isClubs
                  ? setClub({
                      externalOnly: !clubFilters.externalOnly,
                      internalOnly: false,
                    })
                  : setEvent({
                      externalOnly: !eventFilters.externalOnly,
                      internalOnly: false,
                    })
              }
            />
            <ToggleButton
              testID="filter-favorites"
              label={t("events.filters.favoritesOnly")}
              active={filters.favoritesOnly}
              onPress={() =>
                isClubs
                  ? setClub({ favoritesOnly: !clubFilters.favoritesOnly })
                  : setEvent({ favoritesOnly: !eventFilters.favoritesOnly })
              }
            />
          </View>
        </FilterSection>
      </ScrollView>
    </View>
  );
}

