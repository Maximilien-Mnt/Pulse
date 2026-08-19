import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import Markdown from "@ronradtke/react-native-markdown-display";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { useThemeStore } from "@/stores/themeStore";

export function LegalDocumentViewer({ content, title }: { content: string; title?: string }) {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const scrollRef = useRef<ScrollView>(null);
  const cardTopRef = useRef(0);

  // Helper to convert heading text to slug
  const slugify = (text: string): string => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[àáâäã]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôöõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    cardTopRef.current = e.nativeEvent.layout.y;
  }, []);

  // Intercept anchor links and handle them in-page instead of opening new tab.
  const onLinkPress = useCallback(
    (url: string): boolean => {
      // Check if this is an anchor link
      if (url.startsWith('#')) {
        const slug = url.slice(1);
        
        // Use native browser scrolling for anchor links
        if (typeof window !== 'undefined') {
          const headingElement = document.getElementById(slug);
          if (headingElement) {
            // Use native scrollIntoView for smooth in-page scrolling
            headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        
        // Return false to prevent Linking.openURL from being called
        return false;
      }
      
      // Return true to let external links open normally
      return true;
    },
    []
  );

  // Color palette driven by theme
  const colors = isDark
    ? {
        background: "#0A0F1E",
        card: "#1E1E2E",
        border: "#3A3A4A",
        heading: "#FFFFFF",
        body: "#D4D4D8",
        muted: "#A1A1AA",
        accent: "#1E6BFF",
        tableHeaderBg: "#2A2A3A",
        tableRowAltBg: "#26263A",
        divider: "#3A3A4A",
        codeBg: "#2A2A3A",
      }
    : {
        background: "#FAFAFA",
        card: "#FFFFFF",
        border: "#E4E4E7",
        heading: "#18181B",
        body: "#3F3F46",
        muted: "#71717A",
        accent: "#1E6BFF",
        tableHeaderBg: "#F4F4F5",
        tableRowAltBg: "#FAFAFA",
        divider: "#E4E4E7",
        codeBg: "#F4F4F5",
      };

  // Custom render rules to add IDs to headings
  const rules = useMemo(() => ({
    heading1: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View key={node.key} id={id} collapsable={false}>
          {children}
        </View>
      );
    },
    heading2: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View key={node.key} id={id} collapsable={false}>
          {children}
        </View>
      );
    },
    heading3: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View key={node.key} id={id} collapsable={false}>
          {children}
        </View>
      );
    },
  }), []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  const markdownStyles = {
    // --- Body / paragraphs ---
    body: {
      color: colors.body,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Outfit_400Regular",
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
      color: colors.body,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Outfit_400Regular",
    },

    // --- Headings ---
    heading1: {
      color: colors.heading,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "700",
      fontFamily: "Outfit_700Bold",
      marginTop: 24,
      marginBottom: 12,
    },
    heading2: {
      color: colors.heading,
      fontSize: 22,
      lineHeight: 30,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 22,
      marginBottom: 10,
    },
    heading3: {
      color: colors.heading,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 18,
      marginBottom: 8,
    },
    heading4: {
      color: colors.heading,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 16,
      marginBottom: 6,
    },
    heading5: {
      color: colors.heading,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 14,
      marginBottom: 6,
    },
    heading6: {
      color: colors.heading,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 12,
      marginBottom: 4,
    },

    // --- Inline formatting ---
    strong: {
      fontWeight: "700",
      color: colors.heading,
    },
    em: {
      fontStyle: "italic",
      color: colors.body,
    },
    s: {
      textDecorationLine: "line-through",
      color: colors.muted,
    },
    text: {
      color: colors.body,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Outfit_400Regular",
    },
    link: {
      color: colors.accent,
      textDecorationLine: "underline",
    },

    // --- Blockquotes ---
    blockquote: {
      backgroundColor: isDark ? "#16162A" : "#F4F6FB",
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 8,
      marginBottom: 12,
      borderRadius: 6,
    },
    blockquoteText: {
      color: colors.body,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Outfit_400Regular",
      fontStyle: "italic",
    },
    blockquoteFirst: {
      marginTop: 0,
    },
    blockquoteLast: {
      marginBottom: 0,
    },

    // --- Lists ---
    bulletList: {
      marginBottom: 12,
    },
    orderedList: {
      marginBottom: 12,
    },
    bulletListItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    orderedListItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    bulletListIcon: {
      color: colors.accent,
      fontSize: 14,
      marginRight: 8,
      marginTop: 4,
    },
    orderedListIcon: {
      color: colors.accent,
      fontSize: 14,
      marginRight: 8,
      marginTop: 4,
      fontFamily: "Outfit_500Medium",
    },
    listItem: {
      flexShrink: 1,
      color: colors.body,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Outfit_400Regular",
    },
    l1: {
      marginLeft: 0,
    },
    l2: {
      marginLeft: 20,
    },

    // --- Tables ---
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
      marginTop: 10,
      marginBottom: 14,
    },
    tableHeader: {
      backgroundColor: colors.tableHeaderBg,
    },
    tableHeaderCell: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    tableCell: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    tableRow: {},
    tableRowLast: {},
    tableCellLast: {
      borderRightWidth: 0,
    },
    tableHeaderCellLast: {
      borderRightWidth: 0,
    },
    textHeader: {
      color: colors.heading,
      fontWeight: "700",
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Outfit_600SemiBold",
    },
    textCell: {
      color: colors.body,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Outfit_400Regular",
      padding: 0,
    },

    // --- Code ---
    code_inline: {
      fontFamily: "monospace",
      fontSize: 13,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    codeBlock: {
      fontFamily: "monospace",
      fontSize: 13,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 12,
    },
    fence: {
      fontFamily: "monospace",
      fontSize: 13,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 12,
    },

    // --- Horizontal rule ---
    hr: {
      backgroundColor: colors.divider,
      height: 1,
      marginTop: 16,
      marginBottom: 16,
    },
  } as const;

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      {/* Header with back button */}
      <View className="flex-row items-center justify-between px-2 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          className="flex-row items-center gap-1 px-2 py-1"
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Icon name="ChevronLeft" size={20} color="text-primary" />
          <Text className="text-sm font-semibold text-primary">Retour</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          className="flex-1 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50 px-2"
        >
          {title ?? "Document"}
        </Text>
        {/* Balanced spacer to keep the title centered */}
        <View className="w-[72px]" />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerClassName="p-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={onCardLayout}
          className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <Markdown style={markdownStyles} onLinkPress={onLinkPress} rules={rules}>
            {content}
          </Markdown>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}