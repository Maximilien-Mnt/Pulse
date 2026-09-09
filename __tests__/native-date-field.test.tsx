import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { NativeDateField } from "@/components/ui/NativeDateField";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

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

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  const MockDateTimePicker = (props: any) => <View testID="dt-picker" />;
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

const BASE_DATE = new Date(1998, 4, 15, 9, 30, 0, 0);

type Overrides = {
  value?: Date;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (date: Date) => void;
};

function renderField(overrides: Overrides = {}) {
  const onChange = jest.fn();
  const utils = render(
    <NativeDateField
      testID="date-field"
      title="Date"
      confirmLabel="OK"
      cancelLabel="Annuler"
      mode="date"
      value={BASE_DATE}
      onChange={onChange}
      renderTrigger={() => <></>}
      {...overrides}
    />
  );
  return { ...utils, onChange };
}

beforeEach(() => {
  jest.mocked(DateTimePickerAndroid.open).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("NativeDateField", () => {
  it("overlays a native datetime-local input on web and commits the parsed date", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { onChange, getByTestId } = renderField({ mode: "date" });

    const input = getByTestId("date-field");
    expect(input.type).toBe("input");
    expect(input.props.type).toBe("date");
    expect(input.props.value).toBe("1998-05-15");

    fireEvent(input, "change", { target: { value: "2001-07-04" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const received = onChange.mock.calls[0][0] as Date;
    expect(received.getFullYear()).toBe(2001);
    expect(received.getMonth()).toBe(6); // July
    expect(received.getDate()).toBe(4);
  });

  it("opens the native Android dialog directly on tap (no intermediary window)", () => {
    jest.replaceProperty(Platform, "OS", "android");

    const { getByTestId } = renderField({ mode: "date" });

    fireEvent.press(getByTestId("date-field"));

    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    const call = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]![0];
    expect(call.mode).toBe("date");
    expect(call.value).toEqual(BASE_DATE);
    expect(call.onChange).toEqual(expect.any(Function));
  });

  it("sequentially opens date then time dialog for datetime mode on Android", () => {
    jest.replaceProperty(Platform, "OS", "android");

    const { onChange, getByTestId } = renderField({ mode: "datetime" });

    fireEvent.press(getByTestId("date-field"));

    const first = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]![0];
    expect(first.mode).toBe("date");

    // Simulate picking a date → the time dialog must open right after.
    const pickedDate = new Date(2001, 6, 4, 9, 30, 0, 0);
    (first.onChange as any)({ type: "set" }, pickedDate);

    const secondCalls = jest.mocked(DateTimePickerAndroid.open).mock.calls;
    expect(secondCalls.length).toBe(2);
    expect(secondCalls[1]![0].mode).toBe("time");

    // Picking a time commits the final date/time through the component.
    const pickedTime = new Date(2001, 6, 4, 18, 45, 0, 0);
    (secondCalls[1]![0].onChange as any)({ type: "set" }, pickedTime);
    expect(onChange).toHaveBeenCalledWith(pickedTime);
  });

  it("presents the native wheel in a bottom-sheet on iOS and commits on OK", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const { onChange, getByTestId, getByText, queryByText } = renderField();

    expect(queryByText("Annuler")).toBeNull();

    fireEvent.press(getByTestId("date-field"));

    expect(getByText("Annuler")).toBeTruthy();
    expect(getByText("OK")).toBeTruthy();
    expect(getByTestId("dt-picker")).toBeTruthy();

    fireEvent.press(getByText("OK"));
    expect(onChange).toHaveBeenCalledWith(BASE_DATE);
  });

  it("guards against an invalid date value on web so the input stays openable", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { getByTestId } = renderField({ value: new Date("not-a-date") });

    const input = getByTestId("date-field");
    expect(input.type).toBe("input");
    expect(input.props.value).toBe("");
  });

  it("invokes the native showPicker fallback when the web trigger is clicked", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { getByTestId } = renderField({ mode: "date" });

    const input = getByTestId("date-field") as any;
    input.showPicker = jest.fn();

    // Real click → browser currentTarget is the input; drive the handler the
    // same way (RNTL doesn't synthesize event.currentTarget).
    act(() => {
      input.props.onClick({ currentTarget: input });
    });

    expect(input.showPicker).toHaveBeenCalledTimes(1);
  });

  it("ignores empty web changes without firing onChange", () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { onChange, getByTestId } = renderField({ mode: "date" });

    fireEvent(getByTestId("date-field"), "change", { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });
});