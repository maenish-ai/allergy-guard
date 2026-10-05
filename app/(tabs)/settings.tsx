import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGithubUpdater } from "@/hooks/use-github-updater";
import {
  emailEncryptedBackupNow,
  hasBackupPassword,
  loadEmailBackupPreferences,
  providerLabels,
  saveEmailBackupPreferences,
  syncDailyBackupReminder,
  type EmailProvider,
} from "@/lib/email-backup";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  tealSoft: "#EAF6F7",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  bg: "#F5F9FA",
};

const providers: EmailProvider[] = ["gmail", "outlook", "yahoo", "other"];

function formatDate(value?: string) {
  if (!value) return "لا توجد نسخة بعد";
  try {
    return new Intl.DateTimeFormat("ar-JO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function SettingsScreen() {
  const { checkNow } = useGithubUpdater({ autoCheck: false });
  const [checking, setChecking] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAlreadySet, setPasswordAlreadySet] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [lastPreparedAt, setLastPreparedAt] = useState<string | undefined>();
  const [savingBackupSettings, setSavingBackupSettings] = useState(false);
  const [sendingBackup, setSendingBackup] = useState(false);
  const version = Constants.expoConfig?.version ?? "غير معروف";

  useEffect(() => {
    (async () => {
      const [prefs, hasPassword] = await Promise.all([
        loadEmailBackupPreferences(),
        hasBackupPassword(),
      ]);
      setProvider(prefs.provider);
      setEmail(prefs.email);
      setDailyReminder(prefs.dailyReminder);
      setLastPreparedAt(prefs.lastPreparedAt);
      setPasswordAlreadySet(hasPassword);
    })();
  }, []);

  const checkManually = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkNow(true);
    } finally {
      setChecking(false);
    }
  };

  const persistBackupSettings = async (showConfirmation = true) => {
    setSavingBackupSettings(true);
    try {
      const saved = await saveEmailBackupPreferences(
        { provider, email, dailyReminder, lastPreparedAt },
        password || undefined,
      );
      await syncDailyBackupReminder(saved.dailyReminder);
      setEmail(saved.email);
      setPassword("");
      setPasswordAlreadySet(true);
      if (showConfirmation) {
        Alert.alert("تم الحفظ", "تم حفظ إعدادات النسخ الاحتياطي بالبريد.");
      }
      return true;
    } catch (error) {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      return false;
    } finally {
      setSavingBackupSettings(false);
    }
  };

  const sendBackupNow = async () => {
    if (sendingBackup) return;
    const saved = await persistBackupSettings(false);
    if (!saved) return;
    setSendingBackup(true);
    try {
      const result = await emailEncryptedBackupNow();
      setLastPreparedAt(result.lastPreparedAt);
    } catch (error) {
      Alert.alert(
        "تعذر تجهيز النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setSendingBackup(false);
    }
  };

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: palette.bg }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>التحكم بالتطبيق</Text>
        <Text style={styles.title}>الإعدادات</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>النسخ الاحتياطي بالبريد</Text>
          <Text style={styles.cardText}>
            يتم تجهيز نسخة مشفرة من جميع المرضى والسجلات الموجودة على هذا الجهاز، ثم فتح تطبيق البريد لإرسالها إلى بريدك.
          </Text>

          <Text style={styles.label}>نوع البريد</Text>
          <View style={styles.providerGrid}>
            {providers.map((item) => (
              <Pressable
                key={item}
                onPress={() => setProvider(item)}
                style={[styles.providerButton, provider === item && styles.providerButtonActive]}
              >
                <Text style={[styles.providerText, provider === item && styles.providerTextActive]}>
                  {providerLabels[item]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>البريد الذي ستصل إليه النسخة</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor="#99A7B0"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textAlign="left"
            style={styles.input}
          />

          <Text style={styles.label}>كلمة مرور تشفير النسخة</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={passwordAlreadySet ? "اتركها فارغة للإبقاء على الحالية" : "8 أحرف على الأقل"}
            placeholderTextColor="#99A7B0"
            secureTextEntry
            textAlign="right"
            style={styles.input}
          />
          <Text style={styles.helper}>
            احتفظ بهذه الكلمة؛ الملف لا يمكن فتحه بدونها إذا احتجت لاسترجاعه لاحقًا.
          </Text>

          <View style={styles.switchRow}>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: "#C9D2D7", true: "#8FD1D5" }}
              thumbColor={dailyReminder ? palette.teal : "#F4F4F4"}
            />
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>تذكير كل 24 ساعة</Text>
              <Text style={styles.switchText}>ينبهك التطبيق لإرسال أحدث نسخة مشفرة.</Text>
            </View>
          </View>

          <View style={styles.lastRow}>
            <Text style={styles.lastValue}>{formatDate(lastPreparedAt)}</Text>
            <Text style={styles.lastLabel}>آخر نسخة مجهزة</Text>
          </View>

          <Pressable
            onPress={() => persistBackupSettings(true)}
            disabled={savingBackupSettings || sendingBackup}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              (savingBackupSettings || sendingBackup) && styles.buttonDisabled,
            ]}
          >
            {savingBackupSettings ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>حفظ إعدادات النسخ الاحتياطي</Text>
            )}
          </Pressable>

          <Pressable
            onPress={sendBackupNow}
            disabled={sendingBackup || savingBackupSettings}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (sendingBackup || savingBackupSettings) && styles.buttonDisabled,
            ]}
          >
            {sendingBackup ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>نسخ احتياطي الآن وإرساله بالبريد</Text>
            )}
          </Pressable>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              لا تُحفظ كلمة مرور بريدك داخل التطبيق. الإرسال يتم بواسطة تطبيق البريد المثبت على الجهاز، لذلك يعمل مع Gmail وOutlook وYahoo والبريد الآخر دون تخزين بيانات دخول البريد.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تحديثات التطبيق</Text>
          <Text style={styles.cardText}>
            يتحقق التطبيق تلقائيًا من أحدث إصدار مستقر على GitHub. يمكنك أيضًا إجراء فحص يدوي في أي وقت.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.labelInline}>الإصدار الحالي</Text>
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
            يتم فتح رابط التنزيل الرسمي من GitHub بعد العثور على إصدار أحدث، ولا يتم تثبيت أي ملف دون موافقتك من خلال نظام Android.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 40 },
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
    marginBottom: 16,
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
  label: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 7,
    marginTop: 4,
  },
  providerGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  providerButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#F7FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  providerButtonActive: {
    backgroundColor: palette.tealSoft,
    borderColor: palette.teal,
    borderWidth: 2,
  },
  providerText: { color: palette.muted, fontSize: 13, fontWeight: "800" },
  providerTextActive: { color: palette.teal },
  input: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FAFCFD",
    color: palette.navy,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 13,
  },
  helper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
    marginTop: -5,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 14,
    marginTop: 3,
  },
  switchTextWrap: { flex: 1 },
  switchTitle: { color: palette.navy, fontSize: 15, fontWeight: "800", textAlign: "right" },
  switchText: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "right", marginTop: 2 },
  lastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
  lastLabel: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  lastValue: { color: palette.navy, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  versionRow: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelInline: { color: palette.muted, fontSize: 14 },
  version: { color: palette.navy, fontSize: 15, fontWeight: "800" },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: palette.teal,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: palette.teal, fontSize: 14, fontWeight: "900" },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "center" },
  securityNote: {
    marginTop: 14,
    backgroundColor: "#F1F8F8",
    borderRadius: 12,
    padding: 12,
  },
  securityNoteText: {
    color: palette.teal,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
    fontWeight: "700",
  },
  note: {
    borderRadius: 14,
    backgroundColor: palette.tealSoft,
    padding: 14,
  },
  noteText: {
    color: palette.teal,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
});
