import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SignupStep5 from "@/app/auth/signup/step5";
import { useSignupStore } from "@/stores/signupStore";

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, variables?: Record<string, string | number>) =>
      variables ? String(variables.current ?? variables.total ?? "") : key,
    language: "fr",
  }),
  t: (key: string) => key,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
}));

jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({ identify: jest.fn(), capture: jest.fn() }),
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(async () => ({ error: null })),
    },
  },
  signupEdgeFunctionUrl: "https://example.com/signup",
}));

jest.mock("@/lib/imageUpload", () => ({
  uploadImageToStorage: jest.fn(async () => "https://example.com/avatar.jpg"),
}));

jest.mock("react-native-safe-area-context", () => {
  const ReactMock = require("react");
  const { View } = require("react-native");
  const SafeAreaProvider = ({ children }: any) =>
    ReactMock.createElement(View, null, children);
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

const EMPTY_STATE = {
  step1: null,
  step2: null,
  step3: [] as never[],
  step3NoSport: false,
  step4: null,
  step5: null,
};

describe("SignupStep5 profile picture removal", () => {
  beforeEach(() => {
    useSignupStore.setState(EMPTY_STATE);
  });

  it("offers Remove/Change actions after an avatar has been chosen", () => {
    useSignupStore.setState({
      step5: {
        bio: "",
        avatarLocalUri: "file:///avatar.jpg",
        discovery: "",
        discoveryDetails: "",
      },
    });
    const { getByText, queryByText } = render(<SignupStep5 />);

    expect(getByText("signup.step5.removePhoto")).toBeTruthy();
    expect(getByText("signup.step5.changePhoto")).toBeTruthy();
    // The "add a photo later" hint is replaced while an avatar is set.
    expect(queryByText("signup.step5.photoHint")).toBeFalsy();
  });

  it("removes the selected avatar (UI + store) so the account can be created without a photo", () => {
    useSignupStore.setState({
      step5: {
        bio: "",
        avatarLocalUri: "file:///avatar.jpg",
        discovery: "",
        discoveryDetails: "",
      },
    });
    const { getByText, queryByText } = render(<SignupStep5 />);

    fireEvent.press(getByText("signup.step5.removePhoto"));

    // Both avatar actions disappear and the empty-state hint comes back.
    expect(queryByText("signup.step5.removePhoto")).toBeFalsy();
    expect(queryByText("signup.step5.changePhoto")).toBeFalsy();
    expect(queryByText("signup.step5.photoHint")).toBeTruthy();

    // The store no longer carries a local avatar, so the submit flow will
    // send avatar_url: null (account creation without a profile picture).
    const step5 = useSignupStore.getState().step5;
    expect(step5?.avatarLocalUri).toBeNull();
  });
});