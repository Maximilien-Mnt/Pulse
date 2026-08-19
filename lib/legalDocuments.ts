import { LEGAL_CONTENT } from "@/lib/legalContent";

export const LEGAL_DOCUMENTS = {
  terms: {
    title: "Conditions d'utilisation",
    content: LEGAL_CONTENT.terms,
  },
  privacy: {
    title: "Politique de confidentialité",
    content: LEGAL_CONTENT.privacy,
  },
  moderation: {
    title: "Politique de modération",
    content: LEGAL_CONTENT.moderation,
  },
  "bug-report": {
    title: "Comment signaler un problème",
    content: LEGAL_CONTENT.bugReport,
  },
  imprint: {
    title: "Mentions légales",
    content: LEGAL_CONTENT.imprint,
  },
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;