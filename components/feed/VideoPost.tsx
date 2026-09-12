// ---------------------------------------------------------------------------
// PULSE — VideoPost (lazy chunk)
//
// Isolated from PostMedia so `expo-video` + `expo` only ship inside this
// lazily-loaded chunk. Play / mute / fullscreen behavior is unchanged.
// ---------------------------------------------------------------------------

import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Pressable, Text, View } from "react-native";
import { useState, useRef } from "react";
import { t } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/Icon";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPost({
  videoUrl,
  videoThumbnail,
  videoDuration,
  isActive,
  width,
  height,
}: {
  videoUrl: string;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  isActive: boolean;
  width: number;
  height: number;
}) {
  const viewRef = useRef<VideoView>(null);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const [muted, setMuted] = useState(true);

  if (isActive) player.play();
  else player.pause();

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
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen
        allowsPictureInPicture={false}
      />

      {!isPlaying ? (
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          className="justify-center items-center"
          onPress={() => player.play()}
        >
          <Icon name="CirclePlay" size={32} color="white" />
        </Pressable>
      ) : null}

      <Pressable
        className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={() => viewRef.current?.enterFullscreen()}
        hitSlop={8}
      >
        <Icon name="Expand" size={18} color="white" />
      </Pressable>

      <Pressable
        className="absolute bottom-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={toggleMute}
        hitSlop={8}
      >
        <Icon name={muted ? "VolumeX" : "Volume2"} size={18} color="white" />
      </Pressable>

      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
        <Text className="text-white text-xs">
          {videoDuration ? formatDuration(videoDuration) : t("media.video")}
        </Text>
      </View>
    </View>
  );
}
