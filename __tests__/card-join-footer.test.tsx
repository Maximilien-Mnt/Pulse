// ---------------------------------------------------------------------------
// PULSE — CardJoinFooter tests
//
// The card footer is the single source of truth for the three membership
// states of Club/Event cards (member / pending / join). These tests pin the
// coherence rule that motivated the component:
//   - all three states share the exact same box model (full width, h-12,
//     centered) as the primary Button md reference, so the footer never jumps
//     in size or alignment when the state changes,
//   - the member and pending rows are non-interactive status rows,
//   - the join state renders a primary Button that forwards the label, the
//     optional leading icon and onPress,
//   - labels can be specialized per vertical ("Membre" for clubs, "Inscrit"
//     for events) without forking the layout.
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CardJoinFooter } from "@/components/explore/CardJoinFooter";

function renderFooter(props?: Partial<React.ComponentProps<typeof CardJoinFooter>>) {
  return render(
    <CardJoinFooter
      status="none"
      joinLabel="Rejoindre"
      memberLabel="Membre"
      onPress={jest.fn()}
      testID="card-join"
      {...props}
    />,
  );
}

/**
 * Tokens every state must inherit from the primary Button md reference.
 * "w-full" + "h-12" guarantee identical width/height; the flexbox tokens
 * guarantee the label sits on the same optical center line.
 */
const SHARED_BOX_MODEL = ["w-full", "h-12", "flex-row", "items-center", "justify-center"];

describe("CardJoinFooter", () => {
  it("renders a primary Button in the join state and forwards onPress", () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = renderFooter({ onPress });

    expect(getByText("Rejoindre")).toBeTruthy();
    fireEvent.press(getByTestId("card-join-join"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps the join Button label and leading icon configurable", () => {
    const { getByText } = renderFooter({ joinLabel: "S'inscrire", joinIcon: "Globe" });

    expect(getByText("S'inscrire")).toBeTruthy();
  });

  it("gives the join Button the same box model as the status rows", () => {
    const { getByTestId } = renderFooter();
    const joinClass = getByTestId("card-join-join").props.className as string;

    for (const token of SHARED_BOX_MODEL) {
      expect(joinClass).toContain(token);
    }
  });

  it("matches the join Button box model in the member state (no height jump)", () => {
    const { getByTestId, getByText } = renderFooter({ status: "member" });

    expect(getByText("Membre")).toBeTruthy();
    const memberClass = getByTestId("card-join-member").props.className as string;
    for (const token of SHARED_BOX_MODEL) {
      expect(memberClass).toContain(token);
    }
  });

  it("matches the join Button box model in the pending state (no height jump)", () => {
    const { getByTestId, getByText } = renderFooter({ status: "pending" });

    expect(getByText("Demande envoyée")).toBeTruthy();
    const pendingClass = getByTestId("card-join-pending").props.className as string;
    for (const token of SHARED_BOX_MODEL) {
      expect(pendingClass).toContain(token);
    }
  });

  it("renders the pending row as a non-interactive status row", () => {
    const onPress = jest.fn();
    const { getByTestId, queryByTestId } = renderFooter({ status: "pending", onPress });

    // Status rows expose their label to AT instead of a button role.
    const row = getByTestId("card-join-pending");
    expect(row.props.accessibilityRole).toBe("text");
    expect(row.props.accessibilityLabel).toBe("Demande envoyée");
    expect(row.props.onPress).toBeUndefined();
    // The join button is gone while the request is pending.
    expect(queryByTestId("card-join-join")).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders the member row as an accessible, success-tinted status row", () => {
    const { getByTestId } = renderFooter({ status: "member" });

    const row = getByTestId("card-join-member");
    expect(row.props.accessibilityRole).toBe("text");
    expect(row.props.accessibilityLabel).toBe("Membre");
    expect(row.props.className).toContain("bg-success/10");
  });

  it("uses visually distinct tints for the member and pending states", () => {
    const member = renderFooter({ status: "member" });
    const pending = renderFooter({ status: "pending" });

    const memberClass = member.getByTestId("card-join-member").props.className as string;
    const pendingClass = pending.getByTestId("card-join-pending").props.className as string;

    expect(memberClass).not.toBe(pendingClass);
    expect(memberClass).toContain("bg-success/10");
    expect(pendingClass).toContain("bg-neutral-100");
    expect(pendingClass).not.toContain("bg-success/10");
  });

  it("specializes the member and pending labels per vertical", () => {
    const { getByText } = renderFooter({
      status: "member",
      memberLabel: "Inscrit",
    });
    expect(getByText("Inscrit")).toBeTruthy();

    const pending = renderFooter({ status: "pending", pendingLabel: "En attente" });
    expect(pending.getByText("En attente")).toBeTruthy();
  });

  it("renders only the active state's testID", () => {
    const join = renderFooter();
    expect(join.queryByTestId("card-join-member")).toBeNull();
    expect(join.queryByTestId("card-join-pending")).toBeNull();

    const member = renderFooter({ status: "member" });
    expect(member.queryByTestId("card-join-join")).toBeNull();
  });
});