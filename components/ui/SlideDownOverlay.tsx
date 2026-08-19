import { useCallback, useRef, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";

type Props = {
  /** Whether the overlay is visible. */
  visible: boolean;
  /** Called when the overlay should close (full reset). */
  onClose: () => void;
  /** Called when the overlay should dismiss (collapse panel but keep query/options). */
  onDismiss?: () => void;
  /** The content rendered inside the sliding panel. */
  children: ReactNode;
  /**
   * Max height of the panel as a fraction of the screen (0–1).
   * Defaults to 0.65. Set to "auto" to let content define the height.
   */
  maxHeight?: number | "auto";
};

const SWIPE_THRESHOLD = 100;

export function SlideDownOverlay({
  visible,
  onClose,
  onDismiss,
  children,
  maxHeight = 0.65,
}: Props) {
  const screenHeight = Dimensions.get("window").height;

  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ── Animate in/out when `visible` changes ──────────────────────────
  const animateTo = useCallback(
    (show: boolean) => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: show ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: show ? 0 : -screenHeight * 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [backdropOpacity, translateY, screenHeight]
  );

  // Track previous visible to trigger animation on change
  const prevVisible = useRef(visible);
  if (visible !== prevVisible.current) {
    prevVisible.current = visible;
    animateTo(visible);
  }

  // ── Pan responder for swipe-down-to-dismiss ────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gs: PanResponderGestureState
      ) => gs.dy > 5 && Math.abs(gs.dx) < 0.5,

      onPanResponderMove: (
        _evt: GestureResponderEvent,
        gs: PanResponderGestureState
      ) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },

      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gs: PanResponderGestureState
      ) => {
        if (gs.dy > SWIPE_THRESHOLD || gs.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => (onDismiss ?? onClose)());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const panelMaxHeight =
    maxHeight === "auto"
      ? undefined
      : (typeof maxHeight === "number" ? maxHeight : 0.65) * screenHeight;

  return (
    <>
      {/* Backdrop — absolutely positioned, covers the whole screen below the header */}
      <Animated.View
        className="absolute inset-0 z-50"
        pointerEvents="box-none"
        style={{ opacity: backdropOpacity }}
      >
        <Pressable className="flex-1 bg-black/40" onPress={onDismiss ?? onClose} />
      </Animated.View>

      {/* Panel — inline, sits in normal document flow below the header */}
      <Animated.View
        className="bg-white dark:bg-[#1C1C2E] rounded-b-2xl overflow-hidden relative z-50"
        style={{
          maxHeight: panelMaxHeight,
          transform: [{ translateY }],
        }}
      >
        {/* Grab handle */}
        <View
          {...panResponder.panHandlers}
          className="items-center py-2"
        >
          <View className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </View>

        {/* Scrollable content */}
        {children}
      </Animated.View>
    </>
  );
}