import { cn } from "@/utils/format";
import { Image } from "expo-image";
import { View } from "react-native";
import { Icon } from "@/components/ui/Icon";

type Props = {
  uri?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ uri, size = 40, className }: Props) {
  const s = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View className={cn("overflow-hidden bg-neutral-200 dark:bg-neutral-700 justify-center items-center", className)} style={s}>
      {uri ? (
        <Image
          key={uri}
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : (
        <Icon name="User" size={size * 0.6} color="text-tertiary" />
      )}
    </View>
  );
}
