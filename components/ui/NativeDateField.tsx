import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NativeDateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  /**
   * Renders the styled trigger. Receives the current value. The trigger is
   * purely presentational — the actual press lands on the invisible native
   * date control overlaid on top of it, so the button keeps its exact styling.
   */
  renderTrigger: (date: Date) => ReactNode;
  /** Title of the picker (used on the iOS sheet and as accessibility label). */
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  accessibilityLabel?: string;
  /** Only used to target the element in tests / E2E. */
  testID?: string;
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * The invisible web overlay. Kept as plain `CSSProperties` (not RN styles)
 * because it is applied to a real DOM `<input>`, whose `style` prop is typed
 * as `React.CSSProperties`.
 */
const webInputStyles: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  display: "block",
  opacity: 0,
  cursor: "pointer",
  fontSize: 16,
  zIndex: 1,
};

function toInputValue(d: Date, mode: "date" | "time" | "datetime"): string {
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (mode === "time") return timePart;
  if (mode === "date") return datePart;
  return `${datePart}T${timePart}`;
}

function fromInputValue(s: string, mode: "date" | "time" | "datetime"): Date {
  if (mode === "time") {
    const [h = "0", m = "0"] = s.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d;
  }
  if (mode === "date") return new Date(`${s}T00:00:00`);
  return new Date(s);
}

/**
 * A styled field that opens the **native OS date/time picker** on press without
 * any intermediary window and without ever replacing/deforming the trigger.
 *
 * - Web / desktop → an invisible `<input type="date|time|datetime-local">` is
 *   overlaid on the styled button; clicking it opens the browser-native picker.
 * - Android → the native dialog is opened imperatively on tap
 *   (`datetime` opens the date dialog then the time dialog, the platform norm).
 * - iOS → the native wheel is presented in a bottom-sheet Modal (the
 *   platform-standard presentation) and committed with OK/Cancel.
 */
export function NativeDateField({
  value,
  onChange,
  mode = "date",
  minimumDate,
  maximumDate,
  renderTrigger,
  title,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  accessibilityLabel,
  testID,
}: NativeDateFieldProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const closeSheet = () => setIosOpen(false);

  // Web / desktop ── native <input> overlaid on the trigger.
  if (Platform.OS === "web") {
    const inputType = mode === "datetime" ? "datetime-local" : mode;

    /**
     * Explicitly request the native calendar. The invisible overlay against
     * the real browser default on its own in a few edge cases (re-renders,
     * focus quirks, finite-pointer devices), so this guarantees the picker
     * opens wherever `showPicker()` is supported (Chrome, Edge, Firefox 101+,
     * Safari 16+). When it isn't, the browser's own click-to-open still runs.
     *
     * `currentTarget` is preferred (always correct in a real browser); the ref
     * is the fallback for test renderers that don't populate event targets.
     */
    const openNativePicker = (target?: HTMLInputElement) => {
      const input = target ?? nativeInputRef.current;
      if (!input || typeof input.showPicker !== "function") return;
      try {
        input.showPicker();
      } catch {
        // Picker already open / blocked by the browser — default behavior applies.
      }
    };

    return (
      <View style={styles.hostWeb}>
        <View style={styles.trigger} pointerEvents="none">
          {renderTrigger(value)}
        </View>
        <input
          {...(testID ? { testID } : {})}
          ref={nativeInputRef}
          aria-label={accessibilityLabel ?? title}
          type={inputType}
          value={isValidDate(value) ? toInputValue(value, mode) : ""}
          min={minimumDate ? toInputValue(minimumDate, mode) : undefined}
          max={maximumDate ? toInputValue(maximumDate, mode) : undefined}
          onChange={(e) => {
            if (!e.target.value) return;
            const parsed = fromInputValue(e.target.value, mode);
            if (!Number.isNaN(parsed.getTime())) onChange(parsed);
          }}
          onClick={(e) => openNativePicker(e?.currentTarget ?? undefined)}
          style={webInputStyles}
        />
      </View>
    );
  }

  const openAndroidPicker = () => {
    if (mode === "datetime") {
      // Android has no combined dialog: show date, then time.
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type !== "set" || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: "time",
            is24Hour: true,
            onChange: (event2, time) => {
              if (event2.type === "set" && time) onChange(time);
            },
          });
        },
      });
    } else {
      DateTimePickerAndroid.open({
        value,
        mode: mode === "date" ? "date" : "time",
        minimumDate,
        maximumDate,
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === "set" && date) onChange(date);
        },
      });
    }
  };

  // Android ── native dialog opened directly on tap.
  if (Platform.OS === "android") {
    return (
      <View style={styles.host}>
        <View style={styles.trigger} pointerEvents="none">
          {renderTrigger(value)}
        </View>
        <Pressable
          testID={testID}
          style={StyleSheet.absoluteFill as ViewStyle}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          onPress={openAndroidPicker}
        />
      </View>
    );
  }

  // iOS ── bottom-sheet wheel (the platform-standard picker presentation).
  return (
    <View style={styles.host}>
      <View style={styles.trigger} pointerEvents="none">
        {renderTrigger(value)}
      </View>
      <Pressable
        testID={testID}
        style={StyleSheet.absoluteFill as ViewStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={() => {
          setDraft(value);
          setIosOpen(true);
        }}
      />

      <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable onPress={() => {}} style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.sheetHeader}>
              <Pressable
                hitSlop={8}
                onPress={closeSheet}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={[styles.sheetCancel, isDark && styles.textDarkMuted]}>{cancelLabel}</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, isDark && styles.textDark]} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  closeSheet();
                  onChange(draft);
                }}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
              >
                <Text style={[styles.sheetConfirm, isDark && styles.textDarkTint]}>{confirmLabel}</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, date) => {
                if (date) setDraft(date);
              }}
              style={styles.iosWheel}
              themeVariant={isDark ? "dark" : "light"}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
    width: "100%",
    position: "relative",
  },
  hostWeb: {
    alignSelf: "stretch",
    width: "100%",
    position: "relative",
    zIndex: 0,
  },
  trigger: {
    width: "100%",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  sheetCancel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
  },
  sheetConfirm: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  iosWheel: {
    width: "100%",
    height: 216,
  },
  textDark: { color: "#F5F6F8" },
  textDarkMuted: { color: "#A7ACB5" },
  textDarkTint: { color: "#60A5FA" },
});