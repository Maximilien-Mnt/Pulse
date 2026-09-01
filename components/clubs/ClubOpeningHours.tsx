import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { NativePicker } from "@/components/ui/NativePicker";
import { Icon } from "@/components/ui/Icon";
import { Text as PulseText } from "@/components/ui/Text";
import { useTranslation } from "@/hooks/useTranslation";
import {
  OPENING_HOURS_MAX_HOUR,
  OPENING_HOURS_MIN_HOUR,
  formatHour,
  getOpeningStatus,
  groupSlotsByWeekday,
  mondayFirstWeekday,
  sanitizeOpeningHours,
  type OpeningHourSlot,
} from "@/lib/openingHours";

const START_HOURS = Array.from(
  { length: OPENING_HOURS_MAX_HOUR - OPENING_HOURS_MIN_HOUR },
  (_, i) => OPENING_HOURS_MIN_HOUR + i
); // 6..22 — a window must close later than it opens.
const END_HOURS = Array.from(
  { length: OPENING_HOURS_MAX_HOUR - OPENING_HOURS_MIN_HOUR },
  (_, i) => OPENING_HOURS_MIN_HOUR + 1 + i
); // 7..23

export function useWeekdayLabels() {
  const { t } = useTranslation();
  return (weekday: number) => t(`signup.weekday.${weekday}` as any);
}

// ─── Display ──────────────────────────────────────────────────────────────────

/**
 * Weekly opening-hours card with a live Open/Closed status pill.
 * Renders nothing when the club has no configured hours, so clubs that
 * never set a schedule keep exactly the layout they have today.
 */
export function ClubOpeningHoursDisplay({ slots }: { slots: unknown }) {
  const { t } = useTranslation();
  const weekdayLabel = useWeekdayLabels();

  const hours = useMemo(() => sanitizeOpeningHours(slots), [slots]);

  // Recompute the open/closed status every minute so the pill stays accurate.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (hours.length === 0) return null;

  const buckets = groupSlotsByWeekday(hours);
  const status = getOpeningStatus(hours, now);
  const today = mondayFirstWeekday(now);

  const dayNames = Array.from({ length: 7 }, (_, i) => weekdayLabel(i));
  const dayName = (offset?: number) =>
    offset === undefined
      ? ""
      : dayNames[(today + offset) % 7] ?? "";

  return (
    <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
      {/* Live status pill */}
      <View
        className='flex-row items-center gap-1.5 px-3 py-1.5 rounded-full self-start mb-3'
        style={{ backgroundColor: status.open ? "rgba(34,197,94,0.12)" : "rgba(0,0,0,0.06)" }}
      >
        <View
          className='w-2 h-2 rounded-full'
          style={{ backgroundColor: status.open ? "#22c55e" : "#9ca3af" }}
        />
        <PulseText
          variant='caption'
          className='font-semibold'
          style={{ color: status.open ? "#16a34a" : "#6b7280" }}
        >
          {status.open
            ? `${t("clubs.hours.openNow")}${
                status.closesAt !== undefined
                  ? ` · ${t("clubs.hours.closesAt", { time: formatHour(status.closesAt) })}`
                  : ""
              }`
            : status.opensAt !== undefined
              ? `${t("clubs.hours.closedNow")} · ${
                  status.opensWeekday === 0
                    ? t("clubs.hours.opensTodayAt", { time: formatHour(status.opensAt) })
                    : t("clubs.hours.opensOn", {
                        day: dayName(status.opensWeekday),
                        time: formatHour(status.opensAt),
                      })
                }`
              : t("clubs.hours.closedNow")
          }
        </PulseText>
      </View>

      {/* Weekly schedule */}
      <View className='gap-0.5'>
        {buckets.map((daySlots, weekday) => {
          const isToday = weekday === today;
          return (
            <View
              key={weekday}
              className={`flex-row items-center justify-between px-2 py-1.5 rounded-lg ${
                isToday ? "bg-primary/5" : ""
              }`}
            >
              <PulseText
                variant='body'
                className={`text-sm ${
                  isToday
                    ? "text-primary font-semibold"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {dayNames[weekday]}
              </PulseText>
              {daySlots.length === 0 ? (
                <PulseText variant='caption' className='text-neutral-400 dark:text-neutral-500'>
                  —
                </PulseText>
              ) : (
                <View className='flex-row flex-wrap justify-end gap-x-2'>
                  {daySlots.map((slot, i) => (
                    <PulseText
                      key={`${slot.startHour}-${slot.endHour}-${i}`}
                      variant='body'
                      className={`text-sm tabular-nums ${
                        isToday
                          ? "text-neutral-900 dark:text-neutral-50 font-semibold"
                          : "text-neutral-700 dark:text-neutral-200"
                      }`}
                    >
                      {formatHour(slot.startHour)} – {formatHour(slot.endHour)}
                    </PulseText>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function HourPickerButton({
  label,
  value,
  options,
  onSelect,
  title,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onSelect: (v: number) => void;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <NativePicker
      options={options}
      selectedValue={value}
      onSelect={(v) => onSelect(typeof v === "string" ? Number(v) : v)}
      title={title}
      confirmLabel={t("common.ok")}
      cancelLabel={t("common.cancel")}
      accessibilityLabel={title}
      renderTrigger={() => (
        <View className='flex-row items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700/70 border border-neutral-200 dark:border-neutral-600'>
          <PulseText variant='body' className='font-semibold text-neutral-900 dark:text-neutral-50 tabular-nums'>
            {formatHour(value)}
          </PulseText>
          <PulseText variant='caption' className='text-neutral-400'>
            {label}
          </PulseText>
        </View>
      )}
    />
  );
}

/**
 * Controlled weekly-hours editor. Value is always a sanitized slot list,
 * so the parent can persist it directly without further validation.
 */
export function ClubOpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHourSlot[];
  onChange: (slots: OpeningHourSlot[]) => void;
}) {
  const { t } = useTranslation();
  const weekdayLabel = useWeekdayLabels();

  const hours = useMemo(() => sanitizeOpeningHours(value), [value]);
  const buckets = useMemo(() => groupSlotsByWeekday(hours), [hours]);

  const setSlots = (next: OpeningHourSlot[]) =>
    onChange(sanitizeOpeningHours(next));

  const toggleDay = (weekday: number) => {
    if (buckets[weekday]!.length > 0) {
      setSlots(hours.filter((s) => s.weekday !== weekday));
    } else {
      setSlots([...hours, { weekday, startHour: 18, endHour: 21 }]);
    }
  };

  const updateSlot = (weekday: number, index: number, patch: Partial<OpeningHourSlot>) => {
    const next = hours.map((slot) => {
      if (slot.weekday !== weekday) return slot;
      const dayIndex = hours.filter((s) => s.weekday === weekday).indexOf(slot);
      if (dayIndex !== index) return slot;

      const merged = { ...slot, ...patch };
      // Keep windows valid: end must be strictly after start (whole hours).
      if (merged.endHour <= merged.startHour) {
        if ("endHour" in patch && patch.endHour !== undefined) {
          merged.startHour = Math.max(OPENING_HOURS_MIN_HOUR, merged.endHour - 1);
        } else {
          merged.endHour = Math.min(OPENING_HOURS_MAX_HOUR, merged.startHour + 1);
        }
      }
      return merged;
    });
    setSlots(next);
  };

  const addSlot = (weekday: number) => {
    const existing = buckets[weekday]!;
    const last = existing[existing.length - 1];
    const startHour = last ? Math.min(OPENING_HOURS_MAX_HOUR - 1, last.endHour) : 18;
    const endHour = Math.min(OPENING_HOURS_MAX_HOUR, startHour + 2);
    setSlots([...hours, { weekday, startHour, endHour: endHour > startHour ? endHour : OPENING_HOURS_MAX_HOUR }]);
  };

  const removeSlot = (weekday: number, index: number) => {
    const daySlots = hours.filter((s) => s.weekday === weekday);
    const target = daySlots[index];
    if (!target) return;
    setSlots(hours.filter((s) => s !== target));
  };

  return (
    <View className='gap-2'>
      {buckets.map((daySlots, weekday) => {
        const enabled = daySlots.length > 0;
        return (
          <View
            key={weekday}
            className={`p-3 rounded-2xl border ${
              enabled
                ? "bg-primary/5 border-primary/20"
                : "bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700"
            }`}
          >
            {/* Day row: toggle + existing windows */}
            <View className='flex-row items-center gap-3'>
              <Pressable
                onPress={() => toggleDay(weekday)}
                accessibilityRole='switch'
                accessibilityState={{ checked: enabled }}
                hitSlop={6}
                className={`w-6 h-6 rounded-lg items-center justify-center border ${
                  enabled
                    ? "bg-primary border-primary"
                    : "bg-transparent border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {enabled ? <Icon name='Check' size={14} color='white' /> : null}
              </Pressable>
              <PulseText
                variant='body'
                className={`flex-1 ${
                  enabled
                    ? "font-semibold text-neutral-900 dark:text-neutral-50"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {weekdayLabel(weekday)}
              </PulseText>
            </View>

            {enabled ? (
              <View className='mt-3 gap-2'>
                {daySlots.map((slot, index) => (
                  <View key={`${slot.startHour}-${slot.endHour}-${index}`} className='flex-row items-center gap-2'>
                    <View className='flex-1 flex-row items-center gap-2'>
                      <View className='flex-1'>
                        <HourPickerButton
                          label={t("clubs.hours.start")}
                          title={`${weekdayLabel(weekday)} — ${t("clubs.hours.start")}`}
                          value={slot.startHour}
                          options={START_HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
                          onSelect={(h) => updateSlot(weekday, index, { startHour: h })}
                        />
                      </View>
                      <Icon name='ArrowRight' size={14} color='text-tertiary' />
                      <View className='flex-1'>
                        <HourPickerButton
                          label={t("clubs.hours.end")}
                          title={`${weekdayLabel(weekday)} — ${t("clubs.hours.end")}`}
                          value={slot.endHour}
                          options={END_HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
                          onSelect={(h) => updateSlot(weekday, index, { endHour: h })}
                        />
                      </View>
                    </View>
                    {daySlots.length > 1 ? (
                      <Pressable
                        onPress={() => removeSlot(weekday, index)}
                        hitSlop={6}
                        accessibilityRole='button'
                        accessibilityLabel={t("common.delete")}
                        className='p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700'
                      >
                        <Icon name='X' size={14} color='text-secondary' />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  onPress={() => addSlot(weekday)}
                  className='flex-row items-center gap-1.5 self-start mt-1 px-2 py-1 rounded-full'
                >
                  <Icon name='Plus' size={14} color='primary' />
                  <PulseText variant='caption' className='text-primary font-medium'>
                    {t("clubs.hours.addSlot")}
                  </PulseText>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Edit sheet (dashboard) ───────────────────────────────────────────────────

/**
 * Bottom sheet wrapping the editor, following the EditClubEventSheet pattern.
 * The draft is only committed on Save.
 */
export function ClubOpeningHoursSheet({
  visible,
  initialSlots,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  initialSlots: unknown;
  onClose: () => void;
  onSave: (slots: OpeningHourSlot[]) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<OpeningHourSlot[]>([]);

  useEffect(() => {
    if (visible) setDraft(sanitizeOpeningHours(initialSlots));
  }, [visible, initialSlots]);

  if (!visible) return null;

  return (
    <View className='absolute inset-0 z-50'>
      <Pressable className='absolute inset-0 bg-black/50' onPress={onClose} />
      <View className='absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-3xl max-h-[90%]'>
        <View className='flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700'>
          <PulseText variant='subtitle' className='font-semibold text-neutral-900 dark:text-neutral-50 flex-1'>
            {t("clubs.hours.title")}
          </PulseText>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name='X' size={24} color='text-primary' />
          </Pressable>
        </View>

        <View className='px-4 pt-3'>
          <PulseText variant='caption' className='text-neutral-500 mb-3'>
            {t("clubs.hours.hint")}
          </PulseText>
        </View>

        <View className='flex-1 px-4'>
          <ClubOpeningHoursEditor value={draft} onChange={setDraft} />
        </View>

        <View className='flex-row gap-3 p-4 border-t border-neutral-100 dark:border-neutral-700'>
          <View className='flex-1'>
            <Pressable
              onPress={onClose}
              className='py-3 rounded-xl items-center justify-center border border-neutral-200 dark:border-neutral-600'
            >
              <PulseText variant='body' className='font-medium text-neutral-700 dark:text-neutral-200'>
                {t("common.cancel")}
              </PulseText>
            </Pressable>
          </View>
          <View className='flex-1'>
            <Pressable
              onPress={() => onSave(draft)}
              disabled={saving}
              className='py-3 rounded-xl items-center justify-center bg-primary flex-row gap-2'
            >
              {saving ? <ActivityIndicator size='small' color='white' /> : null}
              <PulseText variant='body' className='font-semibold text-white'>
                {t("common.save")}
              </PulseText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
