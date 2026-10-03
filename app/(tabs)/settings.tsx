import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGithubUpdater } from "@/hooks/use-github-updater";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
};

export default function SettingsScreen() {
  const { checkNow } = useGithubUpdater({ autoCheck: false });
  const [checking, setChecking] = useState(false);
  const version = Constants.expoConfig?.version ?? "غير معروف";

  const checkManually = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkNow(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      <View style={styles.content}>
        <Text style={styles.kicker}>التحكم بالتطبيق</Text>
        <Text style={styles.title}>الإعدادات</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تحديثات التطبيق</Text>
          <Text style={styles.cardText}>
            يتحقق التطبيق تلقائيًا من أحدث إصدار مستقر على GitHub. يمكنك أيضًا
            إجراء فحص يدوي في أي وقت.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.label}>الإصدار الحالي</Text>
            <Text style={styles.version}>v{version}</Text>
          </View>
          <Pressable
            onPress={checkManually}
            disabled={checking}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              checking && styles.buttonDisabled,
            ]}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>التحقق من التحديثات الآن</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            يتم فتح رابط التنزيل الرسمي من GitHub بعد العثور على إصدار أحدث، ولا
            يتم تثبيت أي ملف دون موافقتك من خلال نظام Android.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 28 },
  kicker: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 3,
  },
  title: {
    color: palette.navy,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 18,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
  },
  cardTitle: {
    color: palette.navy,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 8,
  },
  cardText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "right",
    marginBottom: 18,
  },
  versionRow: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { color: palette.muted, fontSize: 14 },
  version: { color: palette.navy, fontSize: 15, fontWeight: "800" },
  button: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  note: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#EAF6F7",
    padding: 14,
  },
  noteText: {
    color: palette.teal,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
});
