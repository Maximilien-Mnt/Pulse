import { buildSignupPayload } from "@/utils/signupPayload";
import { OTHER_OPTION } from "@/lib/constants";
import type { SignupSportSelection } from "@/types";
import type { SignupStep2, SignupStep4 } from "@/stores/signupStore";

const step1 = {
  language: "fr",
  fullName: "Maximilien Montant",
  username: "maxm",
  email: "max@example.com",
  password: "SuperSecret1",
};

const step2: SignupStep2 = {
  birthDate: new Date("2000-05-10T00:00:00Z"),
  country: "LU",
  city: "Luxembourg",
};

const baseStep4: SignupStep4 = {
  interestedSports: ["football"],
  objectives: ["se-defouler"],
  heightCm: "178",
  weightKg: "72.5",
};

function build(overrides: {
  step3?: SignupSportSelection[];
  step4?: SignupStep4;
  bio?: string | null;
  avatarUrl?: string | null;
  discoverySource?: string | null;
}) {
  return buildSignupPayload({
    step1,
    step2,
    step3: overrides.step3 ?? [],
    step4: overrides.step4 ?? baseStep4,
    bio: overrides.bio ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
    discoverySource: overrides.discoverySource ?? null,
  });
}

describe("buildSignupPayload", () => {
  it("formats the birth date as YYYY-MM-DD", () => {
    const payload = build({});
    expect(payload.birth_date).toBe("2000-05-10");
  });

  it("coerces empty height/weight strings to null", () => {
    const payload = build({ step4: { ...baseStep4, heightCm: "", weightKg: "  " } });
    expect(payload.height_cm).toBeNull();
    expect(payload.weight_kg).toBeNull();
  });

  it("keeps numeric height/weight", () => {
    const payload = build({});
    expect(payload.height_cm).toBe(178);
    expect(payload.weight_kg).toBe(72.5);
  });

  it("normalizes an empty sport's timeSlots to an empty array", () => {
    const sports: SignupSportSelection[] = [
      {
        sportId: "football",
        level: "Débutant",
        practice: "Loisir",
        timeSlots: [],
      },
    ];
    const payload = build({ step3: sports });
    expect(payload.sports).toHaveLength(1);
    expect(payload.sports[0]?.timeSlots).toEqual([]);
  });

  it("preserves fully-populated timeSlots", () => {
    const sports: SignupSportSelection[] = [
      {
        sportId: "football",
        level: "Débutant",
        practice: "Loisir",
        timeSlots: [{ weekday: 1, startHour: 18, endHour: 20 }],
      },
    ];
    const payload = build({ step3: sports });
    expect(payload.sports[0]?.timeSlots).toEqual([{ weekday: 1, startHour: 18, endHour: 20 }]);
  });

  it("sends an empty sports array for the 'no sport' path", () => {
    const payload = build({ step3: [] });
    expect(payload.sports).toEqual([]);
  });

  it("maps password + identifiers through untouched", () => {
    const payload = build({});
    expect(payload.email).toBe("max@example.com");
    expect(payload.password).toBe("SuperSecret1");
    expect(payload.username).toBe("maxm");
    expect(payload.full_name).toBe("Maximilien Montant");
  });

  it("passes avatarUrl / discoverySource / bio through", () => {
    const payload = build({ bio: "hello", avatarUrl: "https://cdn/x.jpg", discoverySource: "friend" });
    expect(payload.bio).toBe("hello");
    expect(payload.avatar_url).toBe("https://cdn/x.jpg");
    expect(payload.discovery_source).toBe("friend");
  });

  it("replaces the 'Autre' sentinel with the typed level/practice detail", () => {
    const sports: SignupSportSelection[] = [
      {
        sportId: "football",
        level: "Autre",
        practice: "Autre",
        timeSlots: [],
        levelOther: "Niveau amateur U16",
        practiceOther: "Entraînements en petit groupe",
      },
    ];
    const payload = build({ step3: sports });
    expect(payload.sports[0]?.level).toBe("Niveau amateur U16");
    expect(payload.sports[0]?.practice).toBe("Entraînements en petit groupe");
  });

  it("keeps the sentinel when 'Autre' was picked with no detail typed", () => {
    const sports: SignupSportSelection[] = [
      { sportId: "tennis", level: "Autre", practice: "Loisir", timeSlots: [], levelOther: "   " },
    ];
    const payload = build({ step3: sports });
    expect(payload.sports[0]?.level).toBe(OTHER_OPTION);
    expect(payload.sports[0]?.practice).toBe("Loisir");
  });

  it("ignores a stale detail left over from an earlier 'Autre' pick", () => {
    const sports: SignupSportSelection[] = [
      {
        sportId: "basketball",
        level: "Loisirs du dimanche",
        practice: "Loisir",
        timeSlots: [],
        // Stale detail from a previous "Autre" pick: the preset wins.
        levelOther: "should be ignored",
        practiceOther: "should be ignored",
      },
    ];
    const payload = build({ step3: sports });
    expect(payload.sports[0]?.level).toBe("Loisirs du dimanche");
    expect(payload.sports[0]?.practice).toBe("Loisir");
  });

});