import React from "react";
import { ActivityIndicator, View } from "react-native";

import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";
import { LEGAL_CONTENT } from "@/lib/legalContent";
import type { LegalSlug } from "@/lib/legalMeta";

/**
 * Heavy legal body: pulls in the markdown renderer (`@ronradtke/react-native-markdown-display`)
 * and the full markdown content registry. Loaded lazily via `React.lazy` from
 * `[document].tsx` so the initial public route never downloads viewer + content
 * until a specific document is opened. Deep links and auth redirects are preserved
 * because the lazy boundary wraps a Suspense fallback in the route file.
 */
// LEGAL_META slugs (kebab-case) don't all match LEGAL_CONTENT keys (camelCase);
// map them here so every meta slug resolves to its document body.
const SLUG_TO_CONTENT_KEY: Record<string, string> = {
  "bug-report": "bugReport",
};

export function LegalBody({ slug, title }: { slug: LegalSlug; title: string }) {
  const contentKey = (SLUG_TO_CONTENT_KEY[slug] ?? slug) as keyof typeof LEGAL_CONTENT;
  const content = LEGAL_CONTENT[contentKey];

  if (!content) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator />
      </View>
    );
  }

  return <LegalDocumentViewer title={title} content={content} />;
}
