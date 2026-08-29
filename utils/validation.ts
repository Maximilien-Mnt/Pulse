import { t } from "@/hooks/useTranslation";
import { z } from "zod";

export const emailSchema = z.string().email(t("validation.invalidEmail"));

export const passwordSchema = z
  .string()
  .min(8, t("validation.minLength8"))
  .regex(/[A-Z]/, t("validation.uppercase"))
  .regex(/[0-9]/, t("validation.digit"))
  .regex(/[!@#$%^&]/, t("validation.specialChar"));

export const usernameSchema = z
  .string()
  .min(3, t("validation.minLength3"))
  .max(30, t("validation.maxLength30"))
  .regex(/^[a-zA-Z0-9_-]+$/, t("validation.usernameChars"));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, t("validation.passwordRequired")),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, t("validation.confirmRequired")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t("validation.passwordMismatch"),
    path: ["confirmPassword"],
  });

export const signupStep1Schema = z
  .object({
    language: z.string().min(1),
    fullName: z.string().min(1, t("validation.fullNameRequired")),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, t("validation.confirmRequired")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t("validation.passwordMismatch"),
    path: ["confirmPassword"],
  });

export const signupStep2Schema = z
  .object({
    birthDate: z.date({ required_error: t("signup.birthdateRequired") }),
    country: z.string().min(1, t("validation.countryRequired")),
    city: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    const bd = new Date(d.birthDate);
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age -= 1;
    if (age < 16) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("signup.underageMessage"), path: ["birthDate"] });
    }
  });

export const signupStep3Schema = z
  .object({
    entries: z
      .array(
        z.object({
          sportId: z.string(),
          level: z.string().min(1, t("validation.levelRequired")),
          practice: z.string().min(1, t("validation.practiceRequired")),
          levelOther: z.string().optional(),
          practiceOther: z.string().optional(),
          timeSlots: z
          .array(
            z.object({
              weekday: z.number().int().min(0).max(6).optional(),
              startHour: z.number().int().min(6).max(21).optional(),
              endHour: z.number().int().min(7).max(23).optional(),
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
            message: t("validation.endBeforeStart"),
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
    discoveryDetails: z.string().max(500, t("validation.max500")).optional(),
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
  })
  .refine((d) => d.acceptTerms, { message: t("validation.acceptTerms"), path: ["acceptTerms"] })
  .refine((d) => d.acceptPrivacy, {
    message: t("validation.acceptPrivacy"),
    path: ["acceptPrivacy"],
  });

// Club creation schemas
export const clubPrivateSchema = z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  sport: z.string().min(1, t("validation.sportRequired")),
  description: z.string().optional(),
  invitees: z.array(z.string()).default([]),
});

export const clubPublicSchema = z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  sport: z.string().min(1, t("validation.sportRequired")),
  description: z.string().min(50, t("validation.descriptionMin")),
  country: z.string().min(1, t("validation.countryRequired")),
  city: z.string().min(1, t("validation.cityRequired")),
  registration_url: z.string().optional().or(z.literal("")),
  required_level: z.string().optional(),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
  address: z.string().optional(),
  contact_email: z.string().optional().or(z.literal("")),
  website_url: z.string().optional().or(z.literal("")),
  founded_date: z.string().optional(),
  league: z.string().optional(),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  training_schedule: z.any().optional(),
});

// Event creation schemas
export const eventPrivateSchema = z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  sport: z.string().min(1, t("validation.sportRequired")),
  start_date: z.string().datetime({ message: t("validation.startDateRequired") }),
  end_date: z.string().datetime().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  club_id: z.string().optional(),
  invitees: z.array(z.string()).default([]),
}).refine((d) => {
  if (!d.end_date) return true;
  return new Date(d.end_date) > new Date(d.start_date);
}, {
  message: t("validation.endAfterStart"),
  path: ["end_date"],
});

export const eventPublicSchema = z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  sport: z.string().min(1, t("validation.sportRequired")),
  start_date: z.string().datetime({ message: t("validation.startDateRequired") }),
  end_date: z.string().datetime().optional(),
  description: z.string().min(50, t("validation.descriptionMin")),
  country: z.string().min(1, t("validation.countryRequired")),
  city: z.string().min(1, t("validation.cityRequired")),
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
  message: t("validation.endAfterStart"),
  path: ["end_date"],
});

// Group conversation schema
export const groupConversationSchema = z.object({
  name: z.string().min(1, t("forms.groupNameRequired")),
  memberIds: z.array(z.string()).min(1, t("forms.addOneMember")),
  photo_url: z.string().optional(),
});
