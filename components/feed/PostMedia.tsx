import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as WebBrowser from "expo-web-browser";
import type { PostFormat } from "@/types";
import { Dimensions, FlatList, Modal, Pressable, Text, View } from "react-native";
import { useState, useEffect, useRef } from "react";

const W = Dimensions.get("window").width - 32;

type Props = {
  format: PostFormat;
  urls: string[];
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  /** Whether this post is the active/visible one in the feed (controls inline video autoplay). */
  isActive?: boolean;
};


function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Inline feed video: autoplay muted when active, unmute button, and native
 * fullscreen. Uses expo-video's imperative player.
 */
function VideoPost({
  videoUrl,
  videoThumbnail,
  videoDuration,
  isActive,
}: {
  videoUrl: string;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  isActive: boolean;
}) {
  const viewRef = useRef<VideoView>(null);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const [muted, setMuted] = useState(true);

  // Autoplay muted inline when the post becomes active in the feed.
  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  return (
    <View className="mt-2 rounded-lg overflow-hidden bg-black">
      <VideoView
        ref={viewRef}
        player={player}
        style={{ width: W, height: (W * 9) / 16 }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen
        allowsPictureInPicture={false}
      />

      {/* Play/pause overlay when paused */}
      {!isPlaying ? (
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          className="justify-center items-center"
          onPress={() => player.play()}
        >
          <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.85)" />
        </Pressable>
      ) : null}

      {/* Fullscreen button */}
      <Pressable
        className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={() => viewRef.current?.enterFullscreen()}
        hitSlop={8}
      >
        <Ionicons name="expand" size={18} color="#fff" />
      </Pressable>

      {/* Inline mute/unmute button */}
      <Pressable
        className="absolute bottom-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={toggleMute}
        hitSlop={8}
      >
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
      </Pressable>

      {/* Duration badge */}
      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
        <Text className="text-white text-xs">
          {videoDuration ? formatDuration(videoDuration) : "Vidéo"}
        </Text>
      </View>
    </View>
  );
}

export function PostMedia({ format, urls, videoUrl, videoThumbnail, videoDuration, isActive = true }: Props) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (url: string) => {
    setFailedImages((prev) => new Set(prev).add(url));
  };

  if (format === "text" && !videoUrl) return null;

  // Handle video format — inline autoplay muted with unmute + fullscreen
  if (format === "video" && videoUrl) {
    return (
      <VideoPost
        videoUrl={videoUrl}
        videoThumbnail={videoThumbnail}
        videoDuration={videoDuration}
        isActive={isActive}
      />
    );
  }


  if (!urls.length) return null;


  if (format === "image") {
    return (
      <>
          <Pressable
            className="mt-2 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
            onPress={() => setViewer(urls[0] ?? null)}
          >
            {failedImages.has(urls[0] ?? "") ? (
              <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700" style={{ width: W, height: (W * 9) / 16 }}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
            ) : (
              <Image
                source={{ uri: urls[0] ?? "" }}
                style={{ width: W, height: (W * 9) / 16 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                onError={() => handleImageError(urls[0] ?? "")}
              />
            )}
          </Pressable>

        <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
          <View className="flex-1 bg-black">
            <Pressable className="absolute top-14 right-4 z-10 p-3" onPress={() => setViewer(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            {viewer ? (
              <Image
                source={{ uri: viewer }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
          </View>
        </Modal>
      </>
    );
  }

  if (format === "gallery") {
    return (
      <>
        <FlatList
          horizontal
          data={urls}
          keyExtractor={(u, index) => `${u}-${index}`}
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          pagingEnabled
          snapToInterval={W + 8}
          decelerationRate="fast"
          renderItem={({ item, index }) => (
              <Pressable
                className="mr-2 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                style={{ width: W }}
                onPress={() => setViewer(item)}
              >
                {failedImages.has(item) ? (
                  <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700" style={{ width: W, height: (W * 9) / 16 }}>
                    <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: item }}
                    style={{ width: W, height: (W * 9) / 16 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                    onError={() => handleImageError(item)}
                  />
                )}
              </Pressable>
          )}
        />

        <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
          <View className="flex-1 bg-black">
            <Pressable className="absolute top-14 right-4 z-10 p-3" onPress={() => setViewer(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            {viewer ? (
              <Image
                source={{ uri: viewer }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View className="mt-2 gap-3">
      {urls.map((url, index) => {
        const isPdf = url.toLowerCase().endsWith(".pdf");
        const key = `${url}-${index}`;

        if (isPdf) {
          return (
            <Pressable
              key={key}
              className="flex-row items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
              onPress={() => setPdfOpen(url)}
            >
              <Ionicons name="document-text-outline" size={26} color="#1E6BFF" />
              <View className="flex-1">
                <Text className="font-semibold text-neutral-900 dark:text-neutral-50">Document PDF</Text>
                <Text className="text-xs text-neutral-500">Ouvrir le document</Text>
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={key}
            className="rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
            onPress={() => setViewer(url)}
          >
            {failedImages.has(url) ? (
              <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700" style={{ width: W, height: (W * 9) / 16 }}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
            ) : (
              <Image
                source={{ uri: url }}
                style={{ width: W, height: (W * 9) / 16 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
                onError={() => handleImageError(url)}
              />
            )}
          </Pressable>
        );
      })}

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View className="flex-1 bg-black">
          <Pressable className="absolute top-14 right-4 z-10 p-3" onPress={() => setViewer(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {viewer ? (
            <Image
              source={{ uri: viewer }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!pdfOpen} transparent animationType="fade" onRequestClose={() => setPdfOpen(null)}>
        <View className="flex-1 bg-black/80 justify-center items-center px-4">
          <View className="bg-white dark:bg-neutral-900 rounded-2xl p-4 w-full">
            <Text className="font-semibold text-lg text-neutral-900 dark:text-neutral-50">Ouvrir le PDF</Text>
            <Text className="text-neutral-500 mt-1 break-words">{pdfOpen}</Text>
            <View className="flex-row gap-2 mt-4">
              <Pressable
                className="flex-1 py-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 items-center"
                onPress={() => setPdfOpen(null)}
              >
                <Text className="font-semibold text-neutral-900 dark:text-neutral-50">Fermer</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl bg-primary items-center"
                onPress={async () => {
                  if (pdfOpen) await WebBrowser.openBrowserAsync(pdfOpen);
                  setPdfOpen(null);
                }}
              >
                <Text className="font-semibold text-white">Ouvrir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}