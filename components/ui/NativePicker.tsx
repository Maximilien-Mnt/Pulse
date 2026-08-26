// ---------------------------------------------------------------------------
// PULSE — NativePicker
//
// A bottom-sheet picker backed by @react-native-picker/picker so the wheel is
// the OS-native control:
//   - iOS  -> UIPickerView (renders with the Liquid Glass look on iOS 26+)
//   - Android -> native Spinner
//   - web  -> native <select>
//
// Usage:
//   <NativePicker
//     visible={open}
//     title="Country"
//     options={[{ value: "FR", label: "France" }, ...]}
//     selectedValue={country}
//     onSelect={(v) => setCountry(v)}
//     onClose={() => setOpen(false)}
//   />
// ---------------------------------------------------------------------------

import { Picker } from "@react-native-picker/picker";
import { Modal, Pressable, StyleSheet, Text, View, Platform } from "react-native";

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
  const isWeb = Platform.OS === 'web';

  const handleChange = (value: string | number, _index: number): void => {
    // Web picker returns strings via <select>, even for numeric options.
    // Convert back to the option's expected type only if all options share that type.
    let resolved: V = value as V;
    if (isWeb && options.length > 0) {
      const sample = options[0];
      if (sample && typeof sample.value === 'number') {
        const num = Number(value);
        if (Number.isFinite(num)) resolved = num as V;
      }
    }
    onSelect(resolved);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop — taps outside the sheet close the picker */}
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}
          onPress={onClose}
          accessibilityRole="none"
          accessible={false}
        />
        {/* Sheet */}
        <View className="bg-white dark:bg-neutral-900 rounded-t-2xl overflow-hidden pb-6">
          {/* Grab handle */}
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </View>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
            <View className="w-12" />
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50 text-center">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text className="text-base font-semibold text-primary dark:text-primary-dark">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>

          <Picker
            selectedValue={selectedValue}
            onValueChange={(value, index) => handleChange(value as V, index)}
            style={{ height: 216 }}
          >
            {options.map((o) => (
              <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
});