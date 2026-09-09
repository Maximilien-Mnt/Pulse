import { z } from "zod";

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
    const bd = new Date(d.birthDate);
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age -= 1;
    if (age < 16) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "signup.underageMessage", path: ["birthDate"] });
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
export const eventPrivateSchema = z.object({
  name: z.string().min(1, "validation.nameRequired"),
  sport: z.string().min(1, "validation.sportRequired"),
  start_date: z.string().datetime({ message: "validation.startDateRequired" }),
  end_date: z.string().datetime().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  club_id: z.string().optional(),
  invitees: z.array(z.string()).default([]),
}).refine((d) => {
  if (!d.end_date) return true;
  return new Date(d.end_date) > new Date(d.start_date);
}, {
  message: "validation.endAfterStart",
  path: ["end_date"],
});

export const eventPublicSchema = z.object({
  name: z.string().min(1, "validation.nameRequired"),
  sport: z.string().min(1, "validation.sportRequired"),
  start_date: z.string().datetime({ message: "validation.startDateRequired" }),
  end_date: z.string().datetime().optional(),
  description: z.string().min(50, "validation.descriptionMin"),
  country: z.string().min(1, "validation.countryRequired"),
  city: z.string().min(1, "validation.cityRequired"),
  registration_url: z.string().optional().or(z.literal("")),
  venue_address: z.string().optional(),
  price_cents: z.number().min(0).optional(),
  required_level: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional(),
  category: z.string().optional(),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  places_total: z.number().optional(),
  club_id: z.string().optional(),
  website_url: z.string().optional().or(z.literal("")),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
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
