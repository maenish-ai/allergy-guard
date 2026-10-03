import "../global.css";
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

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = systemColorScheme ?? "light";

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AllergyProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </AllergyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
