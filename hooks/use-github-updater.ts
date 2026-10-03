import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { findGithubUpdate, type GithubUpdate } from "@/lib/github-updates";

const AUTO_CHECK_KEY = "autoGitHubChecks";
const LAST_CHECK_KEY = "autoGitHubChecks:lastCheck";
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

function getCurrentVersion() {
  return Constants.expoConfig?.version ?? "0.0.0";
}

export function useGithubUpdater(options: { autoCheck?: boolean } = {}) {
  const autoCheck = options.autoCheck ?? false;
  const checking = useRef(false);
  const mounted = useRef(true);

  const offerUpdate = useCallback(async (update: GithubUpdate) => {
    if (!mounted.current) return;
    Alert.alert(
      `تحديث متاح ${update.version}`,
      "يوجد إصدار أحدث من حارس الحساسية. سيتم فتح صفحة GitHub الرسمية لتنزيل ملف APK.",
      [
        { text: "لاحقًا", style: "cancel" },
        {
          text: "تنزيل التحديث",
          onPress: () => {
            void Linking.openURL(update.apkUrl);
          },
        },
      ],
    );
  }, []);

  const checkNow = useCallback(
    async (manual = false) => {
      if (checking.current) return;
      checking.current = true;
      try {
        const enabled =
          (await AsyncStorage.getItem(AUTO_CHECK_KEY)) !== "false";
        const lastCheck = Number(
          (await AsyncStorage.getItem(LAST_CHECK_KEY)) ?? 0,
        );
        if (!manual && (!enabled || Date.now() - lastCheck < CHECK_INTERVAL_MS))
          return;
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        const update = await findGithubUpdate(getCurrentVersion());
        if (update) await offerUpdate(update);
        if (manual && !update && mounted.current) {
          Alert.alert("لا يوجد تحديث", "أنت تستخدم أحدث إصدار متاح حاليًا.");
        }
      } catch {
        if (manual && mounted.current) {
          Alert.alert(
            "تعذر فحص التحديثات",
            "تحقق من اتصال الإنترنت وحاول مرة أخرى.",
          );
        }
      } finally {
        checking.current = false;
      }
    },
    [offerUpdate],
  );

  useEffect(() => {
    mounted.current = true;
    if (!autoCheck) {
      return () => {
        mounted.current = false;
      };
    }
    void checkNow().catch(() => undefined);
    const onStateChange = (state: AppStateStatus) => {
      if (state === "active") void checkNow().catch(() => undefined);
    };
    const subscription = AppState.addEventListener("change", onStateChange);
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [autoCheck, checkNow]);

  return { checkNow };
}
