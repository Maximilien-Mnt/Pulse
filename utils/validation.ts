import { z } from "zod";
import { isValidLink } from "@/utils/links";
import { isUnderageFromISO, isValidBirthDateISO, toBirthDateISO } from "@/utils/signupDate";

export const linkSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidLink(v), "validation.invalidUrl");

export const hostingSchema = z.enum(["in_app", "external"]);

export const emailSchema = z.string().email("validation.invalidEmail");

export const passwordSchema = z
  .string()
  .min(8, "validation.minLength8")
  .regex(/[A-Z]/, "validation.uppercase")
  .regex(/[0-9]/, "validation.digit")
  .regex(/[!@#$%^&]/, "validation.specialChar");

export const usernameSchema = z
  .string()
  .min(3, "validation.minLength3")
  .max(30, "validation.maxLength30")
  .regex(/^[a-zA-Z0-9_-]+$/, "validation.usernameChars");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.passwordRequired"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.confirmRequired"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const signupStep1Schema = z
  .object({
    language: z.string().min(1),
    fullName: z.string().min(1, "validation.fullNameRequired"),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.confirmRequired"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const signupStep2Schema = z
  .object({
    birthDate: z.date({ required_error: "signup.birthdateRequired" }),
    country: z.string().min(1, "validation.countryRequired"),
    city: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    // Normalize the picker date to the exact `YYYY-MM-DD` the edge function
    // receives, and validate it with the SAME rules as the edge function
    // (invalid calendar dates, UTC age math). Keeping the client and server
    // on one implementation prevents timezone/calendar-date mismatches.
    const iso = toBirthDateISO(d.birthDate);
    if (!iso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "signup.birthdateRequired",
        path: ["birthDate"],
      });
      return;
    }
    if (!isValidBirthDateISO(iso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "signup.step2.birthDateInvalid",
        path: ["birthDate"],
      });
      return;
    }
    if (isUnderageFromISO(iso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "signup.underageMessage",
        path: ["birthDate"],
      });
    }
  });

export const signupStep3Schema = z
  .object({
    entries: z
      .array(
        z.object({
          sportId: z.string(),
          level: z.string().min(1, "validation.levelRequired"),
          practice: z.string().min(1, "validation.practiceRequired"),
          levelOther: z.string().optional(),
          practiceOther: z.string().optional(),
          timeSlots: z
            .array(
              z.object({
                weekday: z.number().int().min(0).max(6),
                startHour: z.number().int().min(6).max(23),
                endHour: z.number().int().min(6).max(23),
              })
            )
            .optional(),

        })
      )
      .min(0),
  })
  .superRefine((d, ctx) => {
    d.entries.forEach((entry, i) => {
      (entry.timeSlots ?? []).forEach((slot, j) => {
        if (
          slot.startHour != null &&
          slot.endHour != null &&
          slot.endHour <= slot.startHour
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "validation.endBeforeStart",
            path: ["entries", i, "timeSlots", j, "endHour"],
          });
        }
      });
    });
  });


export const signupStep4Schema = z.object({
  interestedSports: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  objectivesDetails: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
});

export const signupStep5Schema = z
  .object({
    bio: z.string().max(300).optional(),
    discovery: z.string().optional(),
    discoveryDetails: z.string().max(500, "validation.max500").optional(),
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
  })
  .refine((d) => d.acceptTerms, { message: "validation.acceptTerms", path: ["acceptTerms"] })
  .refine((d) => d.acceptPrivacy, {
    message: "validation.acceptPrivacy",
    path: ["acceptPrivacy"],
  });

// Club creation schemas
export const clubPrivateSchema = z.object({
  name: z.string().min(1, "validation.nameRequired"),
  sport: z.string().min(1, "validation.sportRequired"),
  sports: z.array(z.string()).optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  invitees: z.array(z.string()).default([]),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  phone_number: z.string().optional(),
  instagram_url: z.string().optional().or(z.literal("")),
  facebook_url: z.string().optional().or(z.literal("")),
  tiktok_url: z.string().optional().or(z.literal("")),
  extra_link: z.string().optional().or(z.literal("")),
  website_url: z.string().optional().or(z.literal("")),
  opening_hours: z.array(z.any()).default([]),
});

export const clubPublicSchema = z.object({
  name: z.string().min(1, "validation.nameRequired"),
  sport: z.string().min(1, "validation.sportRequired"),
  sports: z.array(z.string()).min(1, "validation.sportRequired"),
  description: z.string().min(50, "validation.descriptionMin"),
  short_description: z.string().optional(),
  country: z.string().min(1, "validation.countryRequired"),
  city: z.string().min(1, "validation.cityRequired"),
  registration_url: z.string().optional().or(z.literal("")),
  required_level: z.string().optional(),
  required_levels: z.record(z.string(), z.string()).optional(),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(10).default([]),
  address: z.string().optional(),
  contact_email: z.string().optional().or(z.literal("")),
  website_url: z.string().optional().or(z.literal("")),
  founded_date: z.string().optional(),
  league: z.string().optional(),
  postal_code: z.string().optional(),
  phone_number: z.string().optional(),
  instagram_url: z.string().optional().or(z.literal("")),
  facebook_url: z.string().optional().or(z.literal("")),
  tiktok_url: z.string().optional().or(z.literal("")),
  extra_link: z.string().optional().or(z.literal("")),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  training_schedule: z.any().optional(),
});

// Event creation schemas

/**
 * Mandatory registration link — required in EVERY event creation context
 * (in-app hosting included). `hosting` only describes where registration
 * actually happens, it never lifts this requirement.
 */
export const requiredLinkSchema = z
  .string()
  .trim()
  .min(1, "validation.registrationLinkRequired")
  .refine((v) => isValidLink(v), "validation.invalidUrl");

/** Optional e-mail: an empty string means "not provided". */
export const optionalEmailSchema = z.union([z.literal(""), emailSchema]);

/**
 * Two description fields, shared by every event creation form:
 * `short_description` is mandatory (card / lead copy), `description` is the
 * optional long description (full detail page copy).
 */
export const eventDescriptionsSchema = {
  short_description: z
    .string()
    .trim()
    .min(1, "validation.shortDescriptionRequired")
    .max(200, "validation.shortDescriptionMax"),
  description: z.string().max(2000, "validation.longDescriptionMax").optional(),
};

/**
 * Multi-sport events: `sports` holds every selected sport, `sport` stays the
 * primary one (first selected) for cards, filters and search, and
 * `required_levels` maps each selected sport to its own required level.
 */
export const eventSportsSchema = {
  sport: z.string().min(1, "validation.sportRequired"),
  sports: z.array(z.string()).min(1, "validation.sportRequired"),
  required_levels: z.record(
    z.string(),
    z.string().trim().min(1, "validation.eventLevelRequired").max(80, "validation.eventLevelMax")
  ),
};

/** Ensure a level exists for every selected sport and nothing stale remains. */
const validateEventLevels = (
  d: { sport: string; sports: string[]; required_levels: Record<string, string> },
  ctx: z.RefinementCtx
) => {
  if (d.sport !== d.sports[0]) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.eventPrimarySport", path: ["sport"] });
  }
  const levelKeys = Object.keys(d.required_levels);
  for (const sport of d.sports) {
    if (!d.required_levels[sport]?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validation.eventLevelRequired",
        path: ["required_levels", sport],
      });
    }
  }
  for (const sport of levelKeys) {
    if (!d.sports.includes(sport)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validation.eventLevelSport",
        path: ["required_levels", sport],
      });
    }
  }
};

/** Optional logistics fields shared by both event creation contexts. */
export const eventOptionalFieldsSchema = {
  postal_code: z.string().trim().max(20, "validation.maxLength20").optional(),
  contact_email: optionalEmailSchema.optional(),
  league: z.string().trim().optional(),
  website_url: linkSchema.optional().or(z.literal("")),
  cover_url: z.string().optional(),
};

const endAfterStart = {
  check: (d: { start_date: string; end_date?: string }) =>
    !d.end_date || new Date(d.end_date) > new Date(d.start_date),
  message: "validation.endAfterStart",
  path: ["end_date"] as [string],
};

export const eventPrivateSchema = z.object({
  ...eventDescriptionsSchema,
  ...eventSportsSchema,
  ...eventOptionalFieldsSchema,
  name: z.string().min(1, "validation.nameRequired").max(80),
  start_date: z.string().datetime({ message: "validation.startDateRequired" }),
  end_date: z.string().datetime().optional(),
  venue: z.string().max(300).optional(),
  club_id: z.string().optional(),
  invitees: z.array(z.string()).default([]),
  hosting: hostingSchema.default("in_app"),
  registration_url: requiredLinkSchema,
  places_total: z.number().int().positive().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
}).refine(endAfterStart.check, {
  message: endAfterStart.message,
  path: endAfterStart.path,
}).superRefine(validateEventLevels);

export const eventPublicSchema = z.object({
  ...eventDescriptionsSchema,
  ...eventSportsSchema,
  ...eventOptionalFieldsSchema,
  name: z.string().min(1, "validation.nameRequired"),
  start_date: z.string().datetime({ message: "validation.startDateRequired" }),
  end_date: z.string().datetime().optional(),
  country: z.string().min(1, "validation.countryRequired"),
  city: z.string().min(1, "validation.cityRequired"),
  hosting: hostingSchema.default("in_app"),
  registration_url: requiredLinkSchema,
  venue_address: z.string().optional(),
  price_cents: z.number().min(0).optional(),
  age_min: z.number().int().min(0).max(99).optional(),
  age_max: z.number().int().min(0).max(99).optional(),
  places_total: z.number().int().positive().optional(),
  club_id: z.string().optional(),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
}).superRefine((d, ctx) => {
  validateEventLevels(d, ctx);
  if (d.age_min != null && d.age_max != null && d.age_min > d.age_max) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.ageRangeInvalid", path: ["age_max"] });
  }
}).refine((d) => {
  if (!d.end_date) return true;
  return new Date(d.end_date) > new Date(d.start_date);
}, {
  message: "validation.endAfterStart",
  path: ["end_date"],
});

// Group conversation schema
export const groupConversationSchema = z.object({
  name: z.string().min(1, "forms.groupNameRequired"),
  memberIds: z.array(z.string()).min(1, "forms.addOneMember"),
  photo_url: z.string().optional(),
});
