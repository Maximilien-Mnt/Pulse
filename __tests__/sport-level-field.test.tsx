// ---------------------------------------------------------------------------
// SportLevelField (components/shared/SportLevelField.tsx)
//
// Covers the "Autre" contract shared by club/event forms, signup step 3 and
// profile settings: picking "Autre" opens a free-text input, and the typed
// detail REPLACES the sentinel so the stored value stays a plain string.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SportLevelField } from "@/components/shared/SportLevelField";
import { OTHER_OPTION, sportLevels } from "@/lib/constants";

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, tp: (key: string) => key, language: "fr" }),
  t: (key: string) => key,
}));

function Harness({ initial = "", onValue }: { initial?: string; onValue?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <SportLevelField
      sportId="basketball"
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      inputLabel="detail"
      testID="detail"
    />
  );
}

const LEVELS = sportLevels("basketball");

test("renders every preset plus the 'Autre' option", () => {
  render(<Harness />);
  for (const level of LEVELS) {
    expect(screen.getByText(level)).toBeTruthy();
  }
  expect(LEVELS[LEVELS.length - 1]).toBe(OTHER_OPTION);
  // The free-text input is closed until "Autre" is picked.
  expect(screen.queryByTestId("detail")).toBeNull();
});

test("picking 'Autre' emits the sentinel and opens the detail input", () => {
  const onValue = jest.fn();
  render(<Harness onValue={onValue} />);

  fireEvent.press(screen.getByText(OTHER_OPTION));

  expect(onValue).toHaveBeenCalledWith(OTHER_OPTION);
  expect(screen.getByTestId("detail")).toBeTruthy();
});

test("typing a detail replaces the sentinel in the stored value", () => {
  const onValue = jest.fn();
  render(<Harness onValue={onValue} />);

  fireEvent.press(screen.getByText(OTHER_OPTION));
  fireEvent.changeText(screen.getByTestId("detail"), "Niveau amateur U16");

  expect(onValue).toHaveBeenLastCalledWith("Niveau amateur U16");
  // The detail replaced the sentinel: it is the value now.
  expect(screen.getByTestId("detail").props.value).toBe("Niveau amateur U16");
});

test("clearing the detail falls back to the sentinel and keeps the input open", () => {
  const onValue = jest.fn();
  render(<Harness onValue={onValue} />);

  fireEvent.press(screen.getByText(OTHER_OPTION));
  fireEvent.changeText(screen.getByTestId("detail"), "U16");
  fireEvent.changeText(screen.getByTestId("detail"), "");

  expect(onValue).toHaveBeenLastCalledWith(OTHER_OPTION);
  expect(screen.getByTestId("detail")).toBeTruthy();
});

test("a free-text value hydrated from storage reopens the detail input", () => {
  render(<Harness initial="Niveau amateur U16" />);
  expect(screen.getByTestId("detail").props.value).toBe("Niveau amateur U16");
});

test("a stored sentinel reopens an empty detail input", () => {
  render(<Harness initial={OTHER_OPTION} />);
  expect(screen.getByTestId("detail").props.value).toBe("");
});

test("picking a preset closes the detail input and stores the preset", () => {
  const onValue = jest.fn();
  render(<Harness onValue={onValue} />);

  fireEvent.press(screen.getByText(OTHER_OPTION));
  fireEvent.changeText(screen.getByTestId("detail"), "U16");
  fireEvent.press(screen.getByText("Confirmé"));

  expect(onValue).toHaveBeenLastCalledWith("Confirmé");
  expect(screen.queryByTestId("detail")).toBeNull();
});

test("practice options come from the practice ladder", () => {
  render(
    <SportLevelField
      sportId="basketball"
      kind="practice"
      value=""
      onChange={() => {}}
      inputLabel="detail"
    />
  );
  expect(screen.getByText("3x3")).toBeTruthy();
  expect(screen.queryByText("Loisirs du dimanche")).toBeNull();
});
