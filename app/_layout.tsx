import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  I18nManager,
  View,
  Text,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { AllergyProvider } from "@/lib/allergy-store";
import { useGithubUpdater } from "@/hooks/use-github-updater";
import { runAutoEmailBackupIfDue } from "@/lib/auto-email-backup";

try {
  I18nManager.allowRTL(true);
} catch {}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Application Error
        </Text>
        <Text style={{ marginTop: 10 }}>{error.message}</Text>
      </View>
    </SafeAreaProvider>
  );
}


function UpdateWatcher() {
  useGithubUpdater({ autoCheck: true });
  return null;
}

function BackupWatcher() {
  useEffect(() => {
    runAutoEmailBackupIfDue(false).catch((error) =>
      console.warn("Automatic email backup check failed:", error),
    );
  }, []);
  return null;
}

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = systemColorScheme ?? "light";

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AllergyProvider>
          <UpdateWatcher />
          <BackupWatcher />
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </AllergyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
