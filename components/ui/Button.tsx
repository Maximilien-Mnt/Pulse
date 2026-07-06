import { cn } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  className,
  leftIcon,
  rightIcon,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const base =
    "rounded-xl py-4 px-6 flex-row items-center justify-center gap-2 active:opacity-90";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary",
    secondary: "border-2 border-primary bg-transparent",
    ghost: "bg-transparent",
    danger: "bg-error",
  };
  const textVariants: Record<ButtonVariant, string> = {
    primary: "text-white font-semibold text-base",
    secondary: "text-primary font-semibold text-base",
    ghost: "text-primary font-semibold text-base",
    danger: "text-white font-semibold text-base",
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      onPress={onPress}
      className={cn(base, variants[variant], isDisabled && "opacity-40", className)}
      style={animatedStyle}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#1E6BFF" : "#fff"} />
      ) : (
        <>
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={20}
              color={variant === "secondary" || variant === "ghost" ? "#1E6BFF" : "#fff"}
            />
          ) : null}
          <Text className={textVariants[variant]}>{title}</Text>
          {rightIcon ? (
            <Ionicons
              name={rightIcon}
              size={20}
              color={variant === "secondary" || variant === "ghost" ? "#1E6BFF" : "#fff"}
            />
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}
