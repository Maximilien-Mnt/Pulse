import { Platform } from "react-native";
import { Text, View } from "react-native";
import { ToastConfigParams, ToastConfig } from "react-native-toast-message";

// ─────────────────────────────────────────────────────────────────────────────
// Custom toast renderers for react-native-toast-message.
//
// The library's default SuccessToast/ErrorToast/InfoToast render native shadows
// (shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation) which are
// ignored by react-native-web. We provide replacements that also apply
// box-shadow when on web.
//
// Each config entry receives ToastConfigParams and returns React.ReactNode.
// ─────────────────────────────────────────────────────────────────────────────

function PulseToast(params: ToastConfigParams<unknown>) {
  const isWeb = Platform.OS === "web";
  const { text1, text2, onPress, text1Style, text2Style } = params;

  const shadowStyle: object =
    isWeb
      ? { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 5,
        };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isWeb ? "#1f2937" : undefined },
      ]}
      onTouchEnd={onPress}
    >
      <View
        style={[styles.content, shadowStyle]}
      >
        {text1 && (
          <Text
            style={[
              styles.text1,
              { color: isWeb ? "#f9fafb" : undefined },
              text1Style,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {text1}
          </Text>
        )}
        {text2 && (
          <Text
            style={[
              styles.text2,
              { color: isWeb ? "#d1d5db" : undefined },
              text2Style,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
}

const toastConfig: ToastConfig = {
  success: PulseToast,
  error: PulseToast,
  info: PulseToast,
};

const styles = {
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  content: {
    // base content style — shadows added conditionally above
  },
  text1: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  text2: {
    fontSize: 13,
    opacity: 0.85,
    marginTop: 2,
  },
};

export { toastConfig as default, toastConfig };
