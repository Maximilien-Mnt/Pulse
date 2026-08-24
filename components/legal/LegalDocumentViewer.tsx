import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
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
  const scrollOffsetRef = useRef(0);
  const headingYMap = useRef<Map<string, number>>(new Map());
  const headingRefMap = useRef<Map<string, View>>(new Map());

  // Clear heading data when content changes
  useEffect(() => {
    headingRefMap.current = new Map();
    headingYMap.current = new Map();
  }, [content]);

  // Track current scroll offset for anchor link calculation
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

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

  // Extract version from legal content
  const extractVersion = useCallback((text: string): string | undefined => {
    const match = text.match(/\*\*Version du document\s*:\*\*\s*([^\n]+)/);
    return match?.[1]?.trim();
  }, []);

  const version = useMemo(() => extractVersion(content), [content, extractVersion]);

  // Intercept anchor links and handle them in-page with React Native scrolling
  const onLinkPress = useCallback(
    (url: string): boolean => {
      if (url.startsWith('#')) {
        const slug = url.slice(1);
        const headingY = headingYMap.current.get(slug);
        
        if (headingY !== undefined && scrollRef.current) {
          scrollRef.current.scrollTo({ y: headingY, animated: true });
        }
        
        return false;
      }
      
      return true;
    },
    []
  );

  // Store heading refs and Y positions for anchor navigation
  const setHeadingRef = useCallback((slug: string) => (ref: View | null) => {
    if (ref) {
      headingRefMap.current.set(slug, ref);
      if (ref.measure) {
        ref.measure((_x, y, _w, _h, _pageX, _pageY) => {
          headingYMap.current.set(slug, y);
        });
      }
    } else {
      headingRefMap.current.delete(slug);
      headingYMap.current.delete(slug);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

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

  // Custom render rules to add refs to headings
  const rules = useMemo(() => ({
    heading1: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
    heading2: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
    heading3: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
    heading4: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
    heading5: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
    heading6: (node: any, children: any) => {
      const text = node.children?.map((c: any) => c.content || '').join('') || '';
      const id = slugify(text);
      return (
        <View 
          key={node.key} 
          id={id} 
          collapsable={false}
          ref={setHeadingRef(id)}
        >
          {children}
        </View>
      );
    },
  }), [setHeadingRef]);

  const markdownStyles = {
    // --- Body / paragraphs ---
    body: {
      color: colors.body,
      fontSize: 16,
      lineHeight: 26,
      fontFamily: "Outfit_400Regular",
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 16,
      color: colors.body,
      fontSize: 16,
      lineHeight: 26,
      fontFamily: "Outfit_400Regular",
    },

    // --- Headings ---
    heading1: {
      color: colors.heading,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "700",
      fontFamily: "Outfit_700Bold",
      marginTop: 32,
      marginBottom: 16,
    },
    heading2: {
      color: colors.heading,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 28,
      marginBottom: 14,
    },
    heading3: {
      color: colors.heading,
      fontSize: 22,
      lineHeight: 30,
      fontWeight: "600",
      fontFamily: "Outfit_600SemiBold",
      marginTop: 24,
      marginBottom: 12,
    },
    heading4: {
      color: colors.heading,
      fontSize: 19,
      lineHeight: 27,
      fontWeight: "500",
      fontFamily: "Outfit_500Medium",
      marginTop: 20,
      marginBottom: 10,
    },
    heading5: {
      color: colors.heading,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "500",
      fontFamily: "Outfit_500Medium",
      marginTop: 18,
      marginBottom: 8,
    },
    heading6: {
      color: colors.heading,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "500",
      fontFamily: "Outfit_500Medium",
      marginTop: 16,
      marginBottom: 6,
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
      fontSize: 16,
      lineHeight: 26,
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 10,
      marginBottom: 16,
      borderRadius: 8,
    },
    blockquoteText: {
      color: colors.body,
      fontSize: 15,
      lineHeight: 24,
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
      marginBottom: 16,
    },
    orderedList: {
      marginBottom: 16,
    },
    bulletListItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    orderedListItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    bulletListIcon: {
      color: colors.accent,
      fontSize: 16,
      marginRight: 10,
      marginTop: 4,
    },
    orderedListIcon: {
      color: colors.accent,
      fontSize: 16,
      marginRight: 10,
      marginTop: 4,
      fontFamily: "Outfit_500Medium",
    },
    listItem: {
      flexShrink: 1,
      color: colors.body,
      fontSize: 16,
      lineHeight: 26,
      fontFamily: "Outfit_400Regular",
    },
    l1: {
      marginLeft: 0,
    },
    l2: {
      marginLeft: 24,
    },

    // --- Tables ---
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 14,
      marginBottom: 18,
    },
    tableHeader: {
      backgroundColor: colors.tableHeaderBg,
    },
    tableHeaderCell: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.tableHeaderBg,
    },
    tableCell: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    tableRow: {
      backgroundColor: colors.card,
    },
    tableRowLast: {
      borderBottomWidth: 0,
    },
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
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Outfit_400Regular",
      padding: 0,
    },

    // --- Code ---
    code_inline: {
      fontFamily: "monospace",
      fontSize: 14,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    codeBlock: {
      fontFamily: "monospace",
      fontSize: 14,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      padding: 16,
      borderRadius: 10,
      marginTop: 12,
      marginBottom: 16,
    },
    fence: {
      fontFamily: "monospace",
      fontSize: 14,
      color: isDark ? "#E2E8F0" : "#1E293B",
      backgroundColor: colors.codeBg,
      padding: 16,
      borderRadius: 10,
      marginTop: 12,
      marginBottom: 16,
    },

    // --- Horizontal rule ---
    hr: {
      backgroundColor: colors.divider,
      height: 1,
      marginTop: 20,
      marginBottom: 20,
    },
  } as const;

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      {/* Header with back button, title, and version */}
      <View className="flex-row items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
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
        {version ? (
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2">
            v{version}
          </Text>
        ) : (
          <View className="w-8" />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerClassName="p-4"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-100 dark:border-neutral-700"
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
