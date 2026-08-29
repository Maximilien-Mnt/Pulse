import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { useWindowDimensions } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { PostFormat } from "@/types";
import { FlatList, Modal, Platform, Pressable, Text, View } from "react-native";
import { useState, useEffect, useRef, useMemo } from "react";
import { t } from "@/hooks/useTranslation";

const calculateImageHeight = (width: number) => Math.min(300, Math.max(200, width * 0.35));

type Props = {
  format: PostFormat;
  urls: string[];
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  isActive?: boolean;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function VideoPost({
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
          <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.85)" />
        </Pressable>
      ) : null}

      <Pressable
        className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={() => viewRef.current?.enterFullscreen()}
        hitSlop={8}
      >
        <Ionicons name="expand" size={18} color="#fff" />
      </Pressable>

      <Pressable
        className="absolute bottom-2 right-2 bg-black/60 p-2 rounded-full"
        onPress={toggleMute}
        hitSlop={8}
      >
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
      </Pressable>

      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded">
        <Text className="text-white text-xs">
          {videoDuration ? formatDuration(videoDuration) : t("media.video")}
        </Text>
      </View>
    </View>
  );
}

export function PostMedia({ format, urls, videoUrl, videoThumbnail, videoDuration, isActive = true }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const { width, imageHeight } = useMemo(() => {
    const w = screenWidth - 32;
    return { width: w, imageHeight: calculateImageHeight(w) };
  }, [screenWidth]);

  const [viewer, setViewer] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});

  const isWeb = Platform.OS === "web";
  const galleryListRef = useRef<FlatList<string>>(null);
  const [galleryScrollX, setGalleryScrollX] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const STEP_OFFSET = 260;
  const galleryWrapperRef = useRef<View | null>(null);
  const webScrollRef = useRef<HTMLDivElement | null>(null);

  const handleImageError = (url: string) => {
    setFailedImages((prev) => new Set(prev).add(url));
  };

  const handleImageLoad = (url: string, naturalWidth: number, naturalHeight: number) => {
    setImageDimensions((prev) => ({
      ...prev,
      [url]: { width: naturalWidth, height: naturalHeight },
    }));
  };

  if (format === "text" && !videoUrl) return null;

  if (format === "video" && videoUrl) {
    return (
      <VideoPost
        videoUrl={videoUrl}
        videoThumbnail={videoThumbnail}
        videoDuration={videoDuration}
        isActive={isActive}
        width={width}
        height={(width * 9) / 16}
      />
    );
  }

  if (!urls.length) return null;

  if (format === "image") {
    const firstUrl = urls[0] ?? "";
    const dim = imageDimensions[firstUrl];
    const naturalAspect = dim ? dim.width / dim.height : null;
    const containerWidth = naturalAspect ? Math.min(imageHeight * naturalAspect, width) : width;

    return (
      <>
        <Pressable className="mt-2" onPress={() => setViewer(firstUrl)}>
          {failedImages.has(firstUrl) ? (
            <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden" style={{ width: containerWidth, height: imageHeight }}>
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            </View>
          ) : (
            <Image
              source={{ uri: firstUrl }}
              style={{ width: containerWidth, height: imageHeight }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
              onError={() => handleImageError(firstUrl)}
              onLoad={(e) => {
                const { width: natW, height: natH } = e.source;
                if (natW && natH) handleImageLoad(firstUrl, natW, natH);
              }}
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
    const handleGalleryItemPress = (item: string) => {
      setViewer(item);
    };

    const getWebScrollEl = () => {
      if (webScrollRef.current) return webScrollRef.current;
      const wrapper = galleryWrapperRef.current as unknown as HTMLElement | null;
      if (!wrapper) return null;
      const list = wrapper.querySelector('[data-testid="flatlist-scrollview"]') as HTMLDivElement | null;
      if (list) {
        webScrollRef.current = list;
        return list;
      }
      const roleList = wrapper.querySelector('[role="list"]') as HTMLDivElement | null;
      if (roleList && roleList.scrollWidth > roleList.clientWidth) {
        webScrollRef.current = roleList;
        return roleList;
      }
      for (const div of Array.from(wrapper.querySelectorAll("div"))) {
        const d = div as HTMLDivElement;
        if (d.scrollWidth > d.clientWidth + 1) {
          webScrollRef.current = d;
          return d;
        }
      }
      return null;
    };

    const scrollGallery = (dir: "left" | "right") => {
      if (isWeb) {
        const tryScroll = () => {
          const scrollEl = getWebScrollEl();
          if (!scrollEl) return false;
          const current = scrollEl.scrollLeft;
          const max = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
          const next = dir === "left" ? current - STEP_OFFSET : current + STEP_OFFSET;
          const clamped = Math.max(0, Math.min(max, next));
          scrollEl.style.scrollBehavior = "smooth";
          scrollEl.scrollLeft = clamped;
          return true;
        };
        if (tryScroll()) return;
        if (typeof window !== "undefined") {
          const id = window.setTimeout(() => tryScroll(), 60);
          window.setTimeout(() => {
            window.clearTimeout(id);
          }, 800);
        }
        return;
      }

      const list = galleryListRef.current;
      if (!list) return;
      const current = galleryScrollX;
      const max = Math.max(0, maxScroll);
      const next = dir === "left" ? current - STEP_OFFSET : current + STEP_OFFSET;
      const clamped = Math.max(0, Math.min(max, next));
      list.scrollToOffset({ offset: clamped, animated: true } as never);
    };

    const canLeft = galleryScrollX > 1;
    const canRight = !hasScrolled || galleryScrollX < maxScroll - 1;

    useEffect(() => {
      if (!isWeb) return;
      let raf = 0;
      let tries = 0;
      const tryBind = () => {
        const scrollEl = getWebScrollEl();
        if (!scrollEl) {
          if (tries < 40) {
            tries += 1;
            raf = requestAnimationFrame(tryBind);
          }
          return () => {};
        }
        const onDown = (e: any) => {
          const state = {
            startX: e.clientX,
            scrollStart: scrollEl.scrollLeft,
            dragging: false,
            pointerMoved: false,
          };
          const onMove = (ev: PointerEvent) => {
            const dx = ev.clientX - state.startX;
            if (!state.dragging && Math.abs(dx) > 5) {
              state.dragging = true;
              scrollEl.style.scrollBehavior = "auto";
            }
            if (state.dragging) {
              state.pointerMoved = true;
              scrollEl.scrollLeft = state.scrollStart - dx;
            }
          };
          const onUp = () => {
            scrollEl.style.scrollBehavior = "smooth";
            scrollEl.removeEventListener("pointermove", onMove);
            scrollEl.removeEventListener("pointerup", onUp);
            scrollEl.removeEventListener("pointerleave", onUp);
          };
          scrollEl.addEventListener("pointermove", onMove);
          scrollEl.addEventListener("pointerup", onUp);
          scrollEl.addEventListener("pointerleave", onUp);
        };
        scrollEl.addEventListener("pointerdown", onDown);
        return () => {
          cancelAnimationFrame(raf);
          scrollEl.removeEventListener("pointerdown", onDown);
          scrollEl.style.scrollBehavior = "";
        };
      };
      const cleanup = tryBind();
      return () => {
        if (typeof cleanup === "function") cleanup();
        else cancelAnimationFrame(raf);
      };
    }, [isWeb]);

    return (
      <>
        <View className={`mt-2 ${isWeb ? "relative" : ""}`} ref={galleryWrapperRef}>
          <FlatList
            ref={galleryListRef}
            horizontal
            data={urls}
            keyExtractor={(u, index) => `${u}-${index}`}
            showsHorizontalScrollIndicator={false}
            className="pr-10"
            contentContainerStyle={{ alignItems: "flex-start", paddingLeft: 0 }}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const cw = e.nativeEvent.contentSize.width;
              setGalleryScrollX(x);
              setMaxScroll(Math.max(0, cw - width));
              setHasScrolled(true);
            }}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => {
              const dim = imageDimensions[item];
              const naturalAspect = dim ? dim.width / dim.height : null;
              const containerWidth = naturalAspect ? Math.min(imageHeight * naturalAspect, width) : width;

              return (
                <Pressable
                  className="mr-2 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                  style={{ width: containerWidth, height: imageHeight }}
                  onPress={() => handleGalleryItemPress(item)}
                >
                  {failedImages.has(item) ? (
                    <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700" style={{ width: containerWidth, height: imageHeight }}>
                      <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                    </View>
                    ) : (
                    <Image
                      source={{ uri: item }}
                      style={{ width: containerWidth, height: imageHeight }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={200}
                      pointerEvents="none"
                      onError={() => handleImageError(item)}
                      onLoad={(e) => {
                        const { width: natW, height: natH } = e.source;
                        if (natW && natH) handleImageLoad(item, natW, natH);
                      }}
                    />
                  )}
                </Pressable>
              );
            }}
          />

          {isWeb && urls.length > 1 ? (
            <>
              {canLeft ? (
                <Pressable
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700 z-10"
                  onPress={() => scrollGallery("left")}
                >
                  <Ionicons name="chevron-back" size={20} color="#111" />
                </Pressable>
              ) : null}
              {canRight ? (
                <Pressable
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700 z-10"
                  onPress={() => scrollGallery("right")}
                >
                  <Ionicons name="chevron-forward" size={20} color="#111" />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

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

        const dim = imageDimensions[url];
        const naturalAspect = dim ? dim.width / dim.height : null;
        const containerWidth = naturalAspect ? Math.min(imageHeight * naturalAspect, width) : width;

        return (
          <Pressable
            key={key}
            className="rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
            onPress={() => setViewer(url)}
          >
            {failedImages.has(url) ? (
              <View className="items-center justify-center bg-neutral-200 dark:bg-neutral-700" style={{ width: containerWidth, height: imageHeight }}>
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
            ) : (
              <Image
                source={{ uri: url }}
                style={{ width: containerWidth, height: imageHeight }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
                onError={() => handleImageError(url)}
                onLoad={(e) => {
                  const { width: natW, height: natH } = e.source;
                  if (natW && natH) handleImageLoad(url, natW, natH);
                }}
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