import React from "react";
import { render } from "@testing-library/react-native";
import SignupUnder16 from "@/app/auth/signup/under16";

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "fr",
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe("Under16Screen", () => {
  it("renders the underage error message", () => {
    const { getAllByText, getByText } = render(<SignupUnder16 />);
    expect(getAllByText("signup.underage.title").length).toBeGreaterThanOrEqual(1);
    expect(getByText("signup.underage.message")).toBeTruthy();
  });
});
