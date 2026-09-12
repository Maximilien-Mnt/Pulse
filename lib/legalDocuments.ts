import { LEGAL_CONTENT } from "@/lib/legalContent";
import { LEGAL_META, type LegalSlug } from "@/lib/legalMeta";

export { LEGAL_META };
export type { LegalSlug };

export const LEGAL_DOCUMENTS = {
  terms: {
    title: LEGAL_META.terms.title,
    content: LEGAL_CONTENT.terms,
  },
  privacy: {
    title: LEGAL_META.privacy.title,
    content: LEGAL_CONTENT.privacy,
  },
  moderation: {
    title: LEGAL_META.moderation.title,
    content: LEGAL_CONTENT.moderation,
  },
  "bug-report": {
    title: LEGAL_META["bug-report"].title,
    content: LEGAL_CONTENT.bugReport,
  },
  imprint: {
    title: LEGAL_META.imprint.title,
    content: LEGAL_CONTENT.imprint,
  },
} as const;