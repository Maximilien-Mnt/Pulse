import { z } from "zod";

export const emailSchema = z.string().email("Email invalide");

export const passwordSchema = z
  .string()
  .min(8, "Au moins 8 caractères")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[0-9]/, "Au moins un chiffre")
  .regex(/[!@#$%^&]/, "Un caractère spécial parmi !@#$%^&");

export const usernameSchema = z
  .string()
  .min(3, "3 caractères minimum")
  .max(30, "30 caractères maximum")
  .regex(/^[a-zA-Z0-9_-]+$/, "Lettres, chiffres, _ et - uniquement");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export const signupStep1Schema = z
  .object({
    language: z.string().min(1),
    fullName: z.string().min(1, "Nom requis"),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const signupStep2Schema = z
  .object({
    birthDate: z.date({ required_error: "Date de naissance requise" }),
    country: z.string().min(1, "Pays requis"),
    city: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    const bd = new Date(d.birthDate);
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age -= 1;
    if (age < 13) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tu dois avoir au moins 13 ans", path: ["birthDate"] });
    }
  });

export const signupStep3Schema = z.object({
  entries: z
    .array(
      z.object({
        sportId: z.string(),
        level: z.string().min(1, "Niveau requis"),
        practice: z.string().min(1, "Type de pratique requis"),
        weekdays: z.array(z.number()).min(1, "Au moins un jour"),
        timesPerWeek: z.coerce.number().min(1).max(14),
      })
    )
    .min(1, "Sélectionne au moins un sport"),
});

export const signupStep4Schema = z.object({
  interestedSports: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
});

export const signupStep5Schema = z
  .object({
    bio: z.string().max(300).optional(),
    discovery: z.string().optional(),
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
  })
  .refine((d) => d.acceptTerms, { message: "Tu dois accepter les CGU", path: ["acceptTerms"] })
  .refine((d) => d.acceptPrivacy, {
    message: "Tu dois accepter la politique de confidentialité",
    path: ["acceptPrivacy"],
  });

// Club creation schemas
export const clubPrivateSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sport: z.string().min(1, "Sport requis"),
  description: z.string().optional(),
  invitees: z.array(z.string()).default([]),
});

export const clubPublicSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sport: z.string().min(1, "Sport requis"),
  description: z.string().min(50, "Description minimum 50 caractères"),
  country: z.string().min(1, "Pays requis"),
  city: z.string().min(1, "Ville requise"),
  registration_url: z.string().url("URL invalide").optional().or(z.literal("")),
  required_level: z.string().optional(),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
  address: z.string().optional(),
  contact_email: z.string().email("Email invalide").optional().or(z.literal("")),
  website_url: z.string().url("URL invalide").optional().or(z.literal("")),
  founded_date: z.string().optional(),
  league: z.string().optional(),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  training_schedule: z.any().optional(),
});

// Event creation schemas
export const eventPrivateSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sport: z.string().min(1, "Sport requis"),
  start_date: z.string().datetime({ message: "Date de début requise" }),
  end_date: z.string().datetime().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  club_id: z.string().optional(),
  invitees: z.array(z.string()).default([]),
});

export const eventPublicSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sport: z.string().min(1, "Sport requis"),
  start_date: z.string().datetime({ message: "Date de début requise" }),
  end_date: z.string().datetime().optional(),
  description: z.string().min(50, "Description minimum 50 caractères"),
  country: z.string().min(1, "Pays requis"),
  city: z.string().min(1, "Ville requise"),
  registration_url: z.string().url("URL invalide").optional().or(z.literal("")),
  venue_address: z.string().optional(),
  price_cents: z.number().min(0).optional(),
  required_level: z.string().optional(),
  difficulty: z.number().min(1).max(5).optional(),
  category: z.string().optional(),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  places_total: z.number().optional(),
  club_id: z.string().optional(),
  website_url: z.string().url("URL invalide").optional().or(z.literal("")),
  logo_url: z.string().optional(),
  hero_urls: z.array(z.string()).max(5).default([]),
});

// Group conversation schema
export const groupConversationSchema = z.object({
  name: z.string().min(1, "Nom du groupe requis"),
  memberIds: z.array(z.string()).min(1, "Ajoute au moins un membre"),
  photo_url: z.string().optional(),
});
