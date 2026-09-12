// ---------------------------------------------------------------------------
// PULSE — Legal metadata (titles only, no document bodies)
//
// Lightweight registry used by the landing footer / legal hub / contact
// screens. Keeps the 30 kB of legal markdown (lib/legalContent.ts) and the
// markdown renderer out of the initial public-route bundle — bodies load
// only inside app/(public)/legal/[document].tsx.
// ---------------------------------------------------------------------------

export const LEGAL_META = {
  terms: { title: "Conditions d'utilisation" },
  privacy: { title: "Politique de confidentialité" },
  moderation: { title: "Politique de modération" },
  "bug-report": { title: "Comment signaler un problème" },
  imprint: { title: "Mentions légales" },
} as const;

export type LegalSlug = keyof typeof LEGAL_META;
