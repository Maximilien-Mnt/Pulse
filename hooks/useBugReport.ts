// ---------------------------------------------------------------------------
// PULSE — Bug report hook
//
// Collects device/context metadata and inserts into the dedicated
// `bug_reports` table.
// ---------------------------------------------------------------------------

import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Localization from "expo-localization";
import { Dimensions } from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface BugReportPayload {
  message: string;
}

export interface BugReportContext {
  platform: string;
  osVersion?: string;
  appVersion: string;
  deviceModel?: string;
  locale?: string;
  screenResolution?: string;
  timezone?: string;
}

export function useBugReport() {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BugReportPayload) => {
      if (!userId) {
        console.error("[BugReport] No user ID found in auth store");
        throw new Error("Non connecté");
      }

      console.log("[BugReport] Attempting to submit bug report for user:", userId);

      const context = await collectDeviceContext();

      const insertData = {
        reporter_id: userId,
        message: payload.message.trim(),
        platform: context.platform,
        os_version: context.osVersion,
        app_version: context.appVersion,
        device_model: context.deviceModel,
        locale: context.locale,
        screen_resolution: context.screenResolution,
        timezone: context.timezone,
      };

      console.log("[BugReport] Insert data:", insertData);

      const { data, error } = await supabase
        .from("bug_reports")
        .insert(insertData)
        .select();

      if (error) {
        console.error("[BugReport] Insert failed with error:", error);
        console.error("[BugReport] Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("[BugReport] Insert succeeded, returned data:", data);

      // Verify the insert actually persisted
      const { data: verifyData, error: verifyError } = await supabase
        .from("bug_reports")
        .select("id")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (verifyError) {
        console.error("[BugReport] Verification query failed:", verifyError);
      } else if (!verifyData || verifyData.length === 0) {
        console.error("[BugReport] WARNING: Insert returned success but verification found no data!");
        console.error("[BugReport] This suggests the insert may have been rolled back.");
      } else if (verifyData[0]) {
        console.log("[BugReport] Verification successful, latest report ID:", verifyData[0].id);
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("[BugReport] Mutation success, data:", data);
      void qc.invalidateQueries({ queryKey: ["bug_reports"] });
    },
    onError: (error) => {
      console.error("[BugReport] Mutation onError caught:", error);
      throw error;
    },
  });
}

async function collectDeviceContext(): Promise<BugReportContext> {
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  let osVersion: string | undefined;
  let deviceModel: string | undefined;

  if (platform === "ios" || platform === "android") {
    try {
      const [name, version] = await Promise.all([Device.osName, Device.osVersion]);
      if (name && version) osVersion = `${name} ${version}`;
    } catch {
      // ignore
    }
    try {
      deviceModel = (await Device.modelName) ?? undefined;
    } catch {
      // ignore
    }
  }

  let appVersion: string;
  try {
    const appName = (Application as any).applicationName ?? "Pulse";
    const version = (Application as any).nativeApplicationVersion ?? "?";
    appVersion = `${appName} ${version}`;
  } catch {
    appVersion = "Pulse unknown";
  }

  const locale = (Localization as any).locale;
  const screenResolution = getScreenResolution();
  const timezone = (Localization as any).timezone;

  return {
    platform,
    osVersion,
    appVersion,
    deviceModel,
    locale,
    screenResolution,
    timezone,
  };
}

function getScreenResolution(): string | undefined {
  try {
    const { width, height } = Dimensions.get("window");
    if (width && height) return `${width}x${height}`;
  } catch {
    // ignore
  }
  return undefined;
}