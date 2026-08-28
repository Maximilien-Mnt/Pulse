import { Picker } from "@react-native-picker/picker";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useEffect, useRef } from "react";

export type NativePickerOption<V extends string | number> = {
  value: V;
  label: string;
};

type NativePickerProps<V extends string | number> = {
  visible: boolean;
  title: string;
  options: NativePickerOption<V>[];
  selectedValue: V;
  onSelect: (value: V) => void;
  onClose: () => void;
  confirmLabel?: string;
};

export function NativePicker<V extends string | number>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  confirmLabel = "OK",
}: NativePickerProps<V>) {
  const isWeb = Platform.OS === "web";
  const webRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (isWeb && webRef.current) {
        try {
          webRef.current.showPicker?.();
        } catch {
          // Some browsers require a user gesture; focus is a safe fallback.
          webRef.current.focus();
        }
      }
    }, 50);
    return () => clearTimeout(t);
  }, [visible, isWeb]);

  const handleChange = (value: string | number, _index: number): void => {
    let resolved: V = value as V;
    if (isWeb && options.length > 0) {
      const sample = options[0];
      if (sample && typeof sample.value === "number") {
        const num = Number(value);
        if (Number.isFinite(num)) resolved = num as V;
      }
    }
    onSelect(resolved);
  };

  if (!visible) return null;

  if (isWeb) {
    return (
      <View style={styles.webWrapper}>
        <select
          ref={webRef as any}
          value={String(selectedValue)}
          onChange={(e) => handleChange(e.target.value, 0)}
          onBlur={onClose}
          title={title}
          style={styles.webSelect}
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

  return (
    <View style={styles.nativeWrapper}>
      <View style={styles.nativeSheet}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
          >
            <Text style={styles.headerAction}>{confirmLabel}</Text>
          </Pressable>
        </View>

        <Picker
          selectedValue={selectedValue}
          onValueChange={(value, _index) => handleChange(value as V, _index)}
          style={{ height: 216 }}
        >
          {options.map((o) => (
            <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    alignItems: "center",
    paddingVertical: 12,
  },
  webSelect: {
    fontSize: 16,
    minWidth: 200,
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#94a3b8",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  nativeWrapper: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    paddingBottom: 16,
  },
  nativeSheet: {
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerSide: {
    width: 48,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
});
