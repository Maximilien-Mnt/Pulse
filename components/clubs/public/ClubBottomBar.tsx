import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ClubBottomBarProps {
  children: React.ReactNode;
  /** Center content on wide screens (matches detail max-width). */
  maxWidth?: number | string;
}

/**
 * Sticky bottom action bar for club screens.
 *
 * Sits above the tab bar (screens use edges={['top']}), with a top border +
 * surface background so it reads as a docked toolbar. Slides + fades in on
 * mount (skipped when reduced-motion is requested) and keeps actions in the
 * thumb zone instead of buried at the end of a long scroll.
 */
export function ClubBottomBar({ children, maxWidth = 760 }: ClubBottomBarProps) {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width: winWidth } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      delay: 60,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter, reduceMotion]);

  const wide = winWidth > 900;

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
          },
        ],
      }}
    >
      <View
        className="border-t border-neutral-200/70 bg-white/95 dark:bg-[#0D1426]/95 dark:border-neutral-800"
        style={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8),
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 -8px 24px rgba(13,24,82,0.08)' }
            : { elevation: 8 }),
        }}
      >
        <View
          className="flex-row items-center gap-2.5 px-4 pt-2.5"
          style={wide ? { width: '100%', maxWidth: maxWidth as never, alignSelf: 'center' } : undefined}
        >
          {children}
        </View>
      </View>
    </Animated.View>
  );
}
