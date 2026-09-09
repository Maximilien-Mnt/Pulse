import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import SignupStep2 from "@/app/auth/signup/step2";
import { useSignupStore } from "@/stores/signupStore";
import dayjs from "dayjs";

jest.mock("@/hooks/useTranslation", () => ({
  t: (key: string) => key,
  useTranslation: () => ({ t: (key: string) => key, language: "fr" }),
}));

const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));

jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({ capture: jest.fn() }),
}));

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

// The native picker view can't render in jsdom; the date field prefers the
// web <input> path in these tests anyway. The Country field also uses a
// native Picker on Android, so it is stubbed to host elements.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  const MockDateTimePicker = (props: any) => <View testID="dt-picker" />;
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

jest.mock("@react-native-picker/picker", () => {
  const ReactMock = require("react");
  const { View } = require("react-native");
  const Picker = ({ children }: any) => ReactMock.createElement(View, null, children);
  Picker.Item = ({ label }: any) => ReactMock.createElement(View, null, label);
  return { Picker };
});

const resetStore = () =>
  useSignupStore.setState({
    step1: null,
    step2: null,
    step3: [] as never[],
    step3NoSport: false,
    step4: null,
    step5: null,
  });

describe("SignupStep2 birth date", () => {
  beforeEach(() => {
    resetStore();
    mockRouterPush.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets the user change the birth date on web and persists it via Continue", async () => {
    jest.replaceProperty(Platform, "OS", "web");

    const { getByTestId, getByText } = await render(<SignupStep2 />);

    const input = getByTestId("birth-date-field");
    expect(input.type).toBe("input");
    // The field always renders a valid, openable native date input.
    expect(input.props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // User picks a new birth date through the native browser picker.
    await act(() => {
      fireEvent(input, "change", { target: { value: "2001-05-10" } });
    });

    // Trigger re-renders with the picked date.
    expect(getByText("10/05/2001")).toBeTruthy();

    // Continue commits the change into the signup store and advances.
    await act(() => {
      fireEvent.press(getByText("signup.continue"));
    });

    const stored = useSignupStore.getState().step2;
    expect(stored).not.toBeNull();
    expect(dayjs(stored!.birthDate).format("YYYY-MM-DD")).toBe("2001-05-10");
    expect(mockRouterPush).toHaveBeenCalledWith("/auth/signup/step3");
  });

  it("falls back to a valid default when the persisted birth date is corrupted", async () => {
    jest.replaceProperty(Platform, "OS", "web");

    useSignupStore.setState({
      ...useSignupStore.getState(),
      step2: { birthDate: new Date("garbage"), country: "FR" },
    });

    const { getByTestId } = await render(<SignupStep2 />);

    const input = getByTestId("birth-date-field");
    // No "NaN-NaN-NaN" value is pushed into the native input.
    expect(input.props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("opens the native date dialog on Android when the birth-date field is tapped", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const { getByTestId } = await render(<SignupStep2 />);

    await act(() => {
      fireEvent.press(getByTestId("birth-date-field"));
    });

    const { DateTimePickerAndroid } = require("@react-native-community/datetimepicker");
    const open = jest.mocked(DateTimePickerAndroid.open);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]![0].mode).toBe("date");
    // A minimum bound is set so every permitted birth date can be reached.
    expect(open.mock.calls[0]![0].minimumDate).toStrictEqual(expect.any(Date));
  });
});