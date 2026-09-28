// ---------------------------------------------------------------------------
// PULSE — SourceBadge tests
//
// The badge is the app's at-a-glance signal for a club's registration
// workflow (in-app vs external). These tests pin:
//   - the compact chip renders a short label on cards for both states,
//   - the full variant renders the long label on detail screens,
//   - both variants expose the full state name as the accessibility label,
//   - the two states use visually distinct tints (primary vs warning),
//   - labels follow the active language (fr/en).
// ---------------------------------------------------------------------------

import React from "react";
import { render, act } from "@testing-library/react-native";
import { SourceBadge } from "@/components/shared/SourceBadge";
import { translations } from "@/lib/translations";
import { useLanguageStore } from "@/stores/languageStore";

const fr = translations.fr;
const en = translations.en;

describe("SourceBadge", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "fr" } as never);
  });

  it("renders the short in-app label on chips with the primary tint", () => {
    const { getByText, getByLabelText } = render(<SourceBadge variant="chip" />);

    expect(getByText(fr["source.inAppShort"])).toBeTruthy();
    // Screen readers get the full state name, not just the short chip label.
    expect(getByLabelText(fr["source.inApp"])).toBeTruthy();
    expect(getByLabelText(fr["source.inApp"]).props.className).toContain("bg-primary/10");
  });

  it("renders the short external label on chips with the warning tint", () => {
    const { getByText, getByLabelText } = render(
      <SourceBadge isExternal variant="chip" />
    );

    expect(getByText(fr["source.externalShort"])).toBeTruthy();
    expect(getByLabelText(fr["source.external"])).toBeTruthy();
    expect(getByLabelText(fr["source.external"]).props.className).toContain("bg-warning/15");
  });

  it("uses different labels and tints for the two workflows", () => {
    const inApp = render(<SourceBadge variant="chip" />);
    const external = render(<SourceBadge isExternal variant="chip" />);

    // Distinct visible labels → users identify the workflow at first glance.
    expect(inApp.queryByText(fr["source.externalShort"])).toBeNull();
    expect(external.queryByText(fr["source.inAppShort"])).toBeNull();

    const inAppClass = inApp.getByLabelText(fr["source.inApp"]).props.className as string;
    const externalClass = external.getByLabelText(fr["source.external"]).props.className as string;
    expect(inAppClass).not.toBe(externalClass);
  });

  it("renders the full state name in the full variant", () => {
    const inApp = render(<SourceBadge />);
    const external = render(<SourceBadge isExternal />);

    expect(inApp.getByText(fr["source.inApp"])).toBeTruthy();
    expect(external.getByText(fr["source.external"])).toBeTruthy();
  });

  it("switches chip and full labels to English with the language", () => {
    const { getByText, getByLabelText, rerender } = render(
      <SourceBadge isExternal variant="chip" />
    );

    act(() => {
      useLanguageStore.getState().setLanguage("en");
    });
    rerender(<SourceBadge isExternal variant="chip" />);

    expect(getByText(en["source.externalShort"])).toBeTruthy();
    expect(getByLabelText(en["source.external"])).toBeTruthy();
    expect(en["source.external"]).not.toBe(fr["source.external"]);
  });
});
