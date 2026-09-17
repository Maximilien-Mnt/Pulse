import { Picker } from "@react-native-picker/picker";
import { useState, type ReactNode } from "react";
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

export type NativePickerOption<V extends string | number> = {
  value: V;
  label: string;
};

type NativePickerProps<V extends string | number> = {
  options: NativePickerOption<V>[];
  selectedValue: V;
  onSelect: (value: V) => void;
  /**
   * Renders the styled trigger. Receives the display label of the current
   * selection (falls back to `placeholder` when nothing matches). The trigger
   * is purely presentational — the actual press lands on the invisible native
   * picker overlaid on top of it, so the button keeps its exact styling.
   */
  renderTrigger: (valueLabel: string) => ReactNode;
  /** Placeholder label shown when the current selection has no matching option. */
  placeholder?: string;
  /** Title of the picker (used on the iOS sheet and as accessibility label). */
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  accessibilityLabel?: string;
  /** Only used to target the element in tests / E2E. */
  testID?: string;
};

/**
 * A styled select field that opens the **native OS picker** on press without
 * any intermediary window and without ever replacing/deforming the trigger.
 *
 * - Web / desktop → a real native `<select>` is invisibly overlaid on top of
 *   the styled button. Clicking the button is a genuine click on the native
 *   control, so every browser opens its native dropdown.
 * - Android → the native dialog-mode `Picker` is invisibly overlaid on the
 *   button; tapping it opens the OS dialog directly.
 * - iOS → iOS has no programmatic picker, so the native wheel is presented in
 *   a bottom-sheet Modal (the platform-standard presentation).
 */
export function NativePicker<V extends string | number>({
  options,
  selectedValue,
  onSelect,
  renderTrigger,
  placeholder = "",
  title,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  accessibilityLabel,
  testID,
}: NativePickerProps<V>) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<V | null>(null);

  const selectedLabel =
    options.find((o) => String(o.value) === String(selectedValue))?.label ?? placeholder;

  const handleSelect = (value: V) => {
    onSelect(value);
  };

  const closeSheet = () => setIosOpen(false);

  // Web / desktop ── native <select> overlaid on the trigger.
  if (Platform.OS === "web") {
    return (
      <View style={styles.host}>
        <View style={[styles.trigger, { pointerEvents: "none" }]}>
          {renderTrigger(selectedLabel)}
        </View>
        <select
          {...(testID ? { testID } : {})}
          aria-label={accessibilityLabel ?? title}
          value={String(selectedValue)}
          onChange={(e) => {
            let resolved: V = e.target.value as V;
            const sample = options[0];
            if (sample && typeof sample.value === "number") {
              const num = Number(e.target.value);
              if (Number.isFinite(num)) resolved = num as V;
            }
            handleSelect(resolved);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </View>
    );
  }

  // Android ── native dialog-mode Picker overlaid on the trigger.
  if (Platform.OS === "android") {
    return (
      <View style={styles.host}>
        <View style={[styles.trigger, { pointerEvents: "none" }]}>
          {renderTrigger(selectedLabel)}
        </View>
        <View style={styles.androidOverlay}>
          <Picker
            mode="dialog"
            prompt={title}
            selectedValue={selectedValue}
            onValueChange={(value) => handleSelect(value as V)}
            style={styles.androidControl}
          >
            {options.map((o) => (
              <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }
// iOS ── bottom-sheet wheel (the platform-standard picker presentation).
  return (
    <View style={styles.host}>
      <View style={styles.trigger} pointerEvents="none">
        {renderTrigger(selectedLabel)}
      </View>
      <Pressable
        testID={testID}
        style={StyleSheet.absoluteFill as ViewStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={() => {
          setDraft(selectedValue);
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
                  if (draft !== null) handleSelect(draft);
                }}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
              >
                <Text style={[styles.sheetConfirm, isDark && styles.textDarkTint]}>{confirmLabel}</Text>
              </Pressable>
            </View>
            <Picker
              selectedValue={draft ?? selectedValue}
              onValueChange={(value) => setDraft(value as V)}
              style={styles.iosWheel}
              itemStyle={styles.iosWheelItem}
            >
              {options.map((o) => (
                <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
              ))}
            </Picker>
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
  },
  trigger: {
    width: "100%",
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
  },
  androidControl: {
    width: "100%",
    height: "100%",
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
  iosWheelItem: {
    fontSize: 17,
  },
  textDark: { color: "#F5F6F8" },
  textDarkMuted: { color: "#A7ACB5" },
  textDarkTint: { color: "#60A5FA" },
});