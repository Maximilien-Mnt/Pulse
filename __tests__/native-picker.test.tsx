import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { NativePicker } from "@/components/ui/NativePicker";

// jest-expo runs without native modules; provide zeros for safe-area insets.
jest.mock("react-native-safe-area-context", () => {
  const ReactMock = require("react");
  const { View } = require("react-native");
  const SafeAreaProvider = ({ children }: any) => ReactMock.createElement(View, null, children);
  const SafeAreaView = (props: any) => ReactMock.createElement(View, props);
  const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
});

// The native Picker view is mocked with plain host elements so interactions
// can be driven in jest: items relay presses back through `onValueChange`.
jest.mock("@react-native-picker/picker", () => {
  const ReactMock = require("react");
  const Picker = (props: any) => {
    const children = ReactMock.Children.toArray(props.children).map((child: any) =>
      ReactMock.isValidElement(child)
        ? ReactMock.cloneElement(child, {
            onSelectItem: () => props.onValueChange && props.onValueChange(child.props.value, 0),
          })
        : child
    );
    return ReactMock.createElement("MockPicker", null, children);
  };
  Picker.Item = ({ label, value, onSelectItem }: any) =>
    ReactMock.createElement(
      "MockPickerItem",
      { testID: `item-${value}`, onPress: onSelectItem },
      label
    );
  return { Picker };
});

const OPTIONS = [
  { value: 1, label: "01:00" },
  { value: 2, label: "02:00" },
  { value: 3, label: "03:00" },
];

type Overrides = {
  options?: { value: number; label: string }[];
  selectedValue?: number;
  placeholder?: string;
  onSelect?: (value: number) => void;
};

function renderPicker(overrides: Overrides = {}) {
  const onSelect = jest.fn();
  const utils = render(
    <NativePicker<number>
      testID="picker"
      title="Heure"
      confirmLabel="OK"
      cancelLabel="Annuler"
      options={OPTIONS}
      selectedValue={1}
      onSelect={onSelect}
      renderTrigger={(label) => (
        <Text testID="trigger-label">{label}</Text>
      )}
      {...overrides}
    />
  );
  return { ...utils, onSelect };
}

describe("NativePicker", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps the styled trigger mounted and opens the native wheel sheet on iOS", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const { getByTestId, getByText, queryByText } = renderPicker();

    // Trigger is always rendered with the current selection label.
    expect(getByTestId("trigger-label").props.children).toBe("01:00");
    // Sheet is not open yet.
    expect(queryByText("Annuler")).toBeNull();

    fireEvent.press(getByTestId("picker"));

    // Sheet (native presentation) is now visible with the options.
    expect(getByText("Annuler")).toBeTruthy();
    expect(getByText("OK")).toBeTruthy();
    expect(getByTestId("item-2")).toBeTruthy();
    // The trigger is still mounted, untouched by the sheet.
    expect(getByTestId("trigger-label").props.children).toBe("01:00");
  });

  it("commits the drafted value via OK on iOS", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const { onSelect, getByTestId, getByText } = renderPicker();

    fireEvent.press(getByTestId("picker"));
    // Scroll the wheel to a different value, then confirm.
    fireEvent.press(getByTestId("item-3"));
    fireEvent.press(getByText("OK"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("renders a real native <select> on web and fires onSelect on change", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { onSelect, getByTestId } = renderPicker();

    const select = getByTestId("picker");
    expect(select.type).toBe("select");

    fireEvent(select, "change", { target: { value: "150" } });
    expect(onSelect).toHaveBeenCalledWith(150);
  });

  it("shows the placeholder label when no option matches the selection", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { getByTestId } = renderPicker({ selectedValue: 99, placeholder: "Choisir…" });
    expect(getByTestId("trigger-label").props.children).toBe("Choisir…");
  });
});