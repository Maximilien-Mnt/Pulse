import { Image } from "expo-image";
import type { PostFormat } from "@/types";
import { Dimensions, FlatList, View } from "react-native";

const W = Dimensions.get("window").width - 32;

type Props = {
  format: PostFormat;
  urls: string[];
};

export function PostMedia({ format, urls }: Props) {
  if (format === "text" || !urls.length) return null;
  if (format === "image" && urls[0]) {
    return (
      <View className="mt-2 rounded-lg overflow-hidden">
        <Image source={{ uri: urls[0] }} style={{ width: W, height: (W * 9) / 16 }} contentFit="cover" />
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={urls}
      keyExtractor={(u) => u}
      showsHorizontalScrollIndicator={false}
      className="mt-2"
      pagingEnabled
      snapToInterval={W + 8}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <View className="mr-2 rounded-lg overflow-hidden" style={{ width: W }}>
          <Image source={{ uri: item }} style={{ width: W, height: (W * 9) / 16 }} contentFit="cover" />
        </View>
      )}
    />
  );
}
