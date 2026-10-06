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
import { useAllergy } from "@/lib/allergy-store";
import {
  emailEncryptedBackupNow,
  hasBackupPassword,
  loadEmailBackupPreferences,
  pickEncryptedBackupFromFile,
  saveEmailBackupPreferences,
  syncDailyBackupReminder,
} from "@/lib/email-backup";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  tealSoft: "#EAF6F7",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  bg: "#F5F9FA",
  warning: "#8A5A00",
  warningBg: "#FFF7E4",
};

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

function backupPatientCount(data: unknown) {
  if (!data || typeof data !== "object") return 0;
  const patients = (data as { patients?: unknown }).patients;
  return Array.isArray(patients) ? patients.length : 0;
}

export default function SettingsScreen() {
  const { checkNow } = useGithubUpdater({ autoCheck: false });
  const { restoreSnapshot } = useAllergy();
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAlreadySet, setPasswordAlreadySet] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [lastPreparedAt, setLastPreparedAt] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState("");
  const [restoring, setRestoring] = useState(false);
  const version = Constants.expoConfig?.version ?? "غير معروف";

  useEffect(() => {
    (async () => {
      const [prefs, hasPassword] = await Promise.all([
        loadEmailBackupPreferences(),
        hasBackupPassword(),
      ]);
      setEmail(prefs.email);
      setDailyReminder(prefs.dailyReminder);
      setLastPreparedAt(prefs.lastPreparedAt);
      setPasswordAlreadySet(hasPassword);
    })().catch((error) => console.warn("Failed to load backup settings:", error));
  }, []);

  const persistBackupSettings = async (showConfirmation = true) => {
    setSaving(true);
    try {
      const current = await loadEmailBackupPreferences();
      const saved = await saveEmailBackupPreferences(
        {
          ...current,
          provider: "other",
          email,
          dailyReminder,
          autoBackup: false,
          lastPreparedAt,
        },
        password || undefined,
      );
      await syncDailyBackupReminder(saved.dailyReminder);
      setEmail(saved.email);
      setPassword("");
      setPasswordAlreadySet(true);
      if (showConfirmation) {
        Alert.alert("تم الحفظ", "تم حفظ البريد وإعدادات النسخ الاحتياطي على هذا الجهاز.");
      }
      return true;
    } catch (error) {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const sendBackupNow = async () => {
    if (sending || saving) return;
    setSending(true);
    setSendingMessage(password.trim() ? "جاري إعداد رمز الحماية لأول مرة…" : "جاري إنشاء النسخة…");
    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const saved = await persistBackupSettings(false);
      if (!saved) return;
      setSendingMessage("جاري تشفير النسخة…");
      progressTimer = setTimeout(() => {
        setSendingMessage("جاري فتح تطبيق البريد…");
      }, 2000);
      const result = await emailEncryptedBackupNow();
      setLastPreparedAt(result.lastPreparedAt);
      Alert.alert(
        result.deliveryMethod === "mail" ? "تم فتح البريد" : "تم فتح المشاركة",
        result.deliveryMethod === "mail"
          ? "النسخة المشفرة مرفقة والرسالة موجهة إلى بريدك. اضغط «إرسال» داخل تطبيق البريد."
          : `اختر Gmail أو Outlook أو تطبيق البريد الذي تستخدمه، ثم أرسل الملف إلى ${result.recipient}.`,
      );
    } catch (error) {
      Alert.alert("تعذر تجهيز النسخة", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      if (progressTimer) clearTimeout(progressTimer);
      setSendingMessage("");
      setSending(false);
    }
  };

  const restoreFromFile = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await pickEncryptedBackupFromFile();
      if (!result) return;
      const patientCount = backupPatientCount(result.payload.data);
      const backupDate = formatDate(result.payload.exportedAt);
      Alert.alert(
        "استرجاع النسخة؟",
        `الملف: ${result.fileName}\nالتاريخ: ${backupDate}\nعدد ملفات المرضى: ${patientCount}\n\nالاسترجاع سيستبدل البيانات الحالية على هذا الجهاز.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استرجاع الآن",
            style: "destructive",
            onPress: () => {
              try {
                restoreSnapshot(result.payload.data);
                Alert.alert("تم الاسترجاع", "تم استرجاع المرضى والسجلات بنجاح.");
              } catch (error) {
                Alert.alert(
                  "تعذر الاسترجاع",
                  error instanceof Error ? error.message : "بيانات النسخة غير صالحة.",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "تعذر فتح النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setRestoring(false);
    }
  };

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
      style={{ backgroundColor: palette.bg }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>التحكم بالتطبيق</Text>
        <Text style={styles.title}>الإعدادات</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>نسخة احتياطية على بريدك</Text>
          <Text style={styles.cardText}>
            بدون حسابات مطور وبدون سحابة وبدون أي اشتراك. التطبيق يجهز ملفًا مشفرًا من جميع المرضى والسجلات، ثم يفتح تطبيق البريد الموجود على الهاتف والرسالة جاهزة للإرسال إلى بريدك.
          </Text>

          <Text style={styles.label}>البريد الذي تريد حفظ النسخة فيه</Text>
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

          <Text style={styles.label}>رمز حماية النسخة الاحتياطية — تنشئه أنت</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={passwordAlreadySet ? "اتركه فارغًا للإبقاء على الرمز الحالي" : "اكتب رمزًا تتذكره — 8 أحرف على الأقل (ويُفضّل 12+)"}
            placeholderTextColor="#99A7B0"
            secureTextEntry
            textAlign="right"
            style={styles.input}
          />
          <Text style={styles.helper}>
            هذا الرمز ليس كلمة مرور Gmail أو البريد. أنت تنشئه داخل التطبيق لحماية ملف النسخة فقط. احتفظ به لأنك ستحتاجه عند استرجاع النسخة على جهاز آخر. أول إعداد للحماية قد يستغرق بضع ثوانٍ، وبعدها تصبح عملية تجهيز النسخ أسرع.
          </Text>

          <View style={styles.sendBox}>
            <Text style={styles.sendTitle}>إرسال نسخة احتياطية الآن</Text>
            <Text style={styles.sendText}>
              سيفتح تطبيق البريد على هاتفك، ويكون بريدك والملف المشفّر مرفقين وجاهزين. بعدها اضغط «إرسال» داخل البريد فقط.
            </Text>
            <Pressable
              onPress={sendBackupNow}
              disabled={sending || saving}
              accessibilityRole="button"
              accessibilityLabel="إرسال النسخة الاحتياطية إلى البريد"
              style={({ pressed }) => [
                styles.sendButtonPressable,
                pressed && styles.buttonPressed,
                (sending || saving) && styles.buttonDisabled,
              ]}
            >
              <View pointerEvents="none" style={styles.sendButtonSurface}>
                {sending ? (
                  <View style={styles.sendingContent}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.sendingText}>{sendingMessage || "جاري تجهيز النسخة…"}</Text>
                  </View>
                ) : (
                  <Text style={styles.sendButtonText}>إرسال النسخة الاحتياطية إلى البريد</Text>
                )}
              </View>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: "#C9D2D7", true: "#8FD1D5" }}
              thumbColor={dailyReminder ? palette.teal : "#F4F4F4"}
            />
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>تذكير كل 24 ساعة</Text>
              <Text style={styles.switchText}>
                يصلك تنبيه لتجهيز أحدث نسخة. الإرسال نفسه يحتاج ضغطة إرسال داخل تطبيق البريد لحماية حسابك.
              </Text>
            </View>
          </View>

          <View style={styles.lastRow}>
            <Text style={styles.lastValue}>{formatDate(lastPreparedAt)}</Text>
            <Text style={styles.lastLabel}>آخر نسخة مجهزة</Text>
          </View>

          <Pressable
            onPress={() => persistBackupSettings(true)}
            disabled={saving || sending}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              (saving || sending) && styles.buttonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>حفظ الإعدادات</Text>
            )}
          </Pressable>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>خطوتان فقط</Text>
            <Text style={styles.infoText}>
              1) اضغط «إرسال النسخة الاحتياطية إلى البريد».  2) عندما يفتح Gmail أو Outlook أو أي تطبيق بريد، اضغط «إرسال».
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>استرجاع نسخة قديمة</Text>
          <Text style={styles.cardText}>
            من بريدك نزّل ملف النسخة المرفق، ثم اضغط هنا واختر ملف .agbackup. سيطلب التطبيق تأكيدًا قبل استبدال أي بيانات حالية.
          </Text>
          <Pressable
            onPress={restoreFromFile}
            disabled={restoring}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              restoring && styles.buttonDisabled,
            ]}
          >
            {restoring ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>اختيار ملف واسترجاع النسخة</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تحديثات التطبيق</Text>
          <Text style={styles.cardText}>
            يتحقق التطبيق من أحدث إصدار مستقر على GitHub. يمكنك أيضًا إجراء فحص يدوي في أي وقت.
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
            بيانات المرضى تبقى على الجهاز. النسخ الاحتياطي لا يستخدم أي خادم خاص بنا، ولا يحتاج Google Cloud أو Microsoft Entra أو مفاتيح OAuth.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 40 },
  kicker: { color: palette.teal, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 3 },
  title: { color: palette.navy, fontSize: 28, fontWeight: "800", textAlign: "right", marginBottom: 18 },
  card: { backgroundColor: palette.card, borderRadius: 20, borderWidth: 1, borderColor: palette.line, padding: 18, marginBottom: 16 },
  cardTitle: { color: palette.navy, fontSize: 19, fontWeight: "800", textAlign: "right", marginBottom: 8 },
  cardText: { color: palette.muted, fontSize: 14, lineHeight: 23, textAlign: "right", marginBottom: 18 },
  label: { color: palette.navy, fontSize: 14, fontWeight: "800", textAlign: "right", marginBottom: 7, marginTop: 4 },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: "#FAFCFD", color: palette.navy, paddingHorizontal: 14, fontSize: 15, marginBottom: 13 },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: -5, marginBottom: 12 },
  sendBox: { marginTop: 4, marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: palette.teal, backgroundColor: palette.tealSoft },
  sendTitle: { color: palette.navy, fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 5 },
  sendText: { color: palette.muted, fontSize: 13, lineHeight: 21, textAlign: "right", marginBottom: 12 },
  sendButtonPressable: { width: "100%", borderRadius: 16, overflow: "hidden" },
  sendButtonSurface: { minHeight: 66, width: "100%", borderRadius: 16, backgroundColor: "#1267C4", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderWidth: 2, borderColor: "#0A4F9F", elevation: 4 },
  sendButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", textAlign: "center" },
  sendingContent: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10 },
  sendingText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", textAlign: "center" },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, marginTop: 3 },
  switchTextWrap: { flex: 1 },
  switchTitle: { color: palette.navy, fontSize: 15, fontWeight: "800", textAlign: "right" },
  switchText: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "right", marginTop: 2 },
  lastRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 14, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line },
  lastLabel: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  lastValue: { color: palette.navy, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  versionRow: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelInline: { color: palette.muted, fontSize: 14 },
  version: { color: palette.navy, fontSize: 15, fontWeight: "800" },
  button: { minHeight: 54, borderRadius: 14, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 10 },
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 2, borderColor: palette.teal, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: palette.teal, fontSize: 14, fontWeight: "900", textAlign: "center" },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "center" },
  infoBox: { marginTop: 14, borderRadius: 14, backgroundColor: palette.warningBg, padding: 13 },
  infoTitle: { color: palette.warning, fontWeight: "900", fontSize: 13, textAlign: "right", marginBottom: 4 },
  infoText: { color: palette.warning, fontSize: 12, lineHeight: 20, textAlign: "right" },
  note: { borderRadius: 14, backgroundColor: palette.tealSoft, padding: 14 },
  noteText: { color: palette.teal, fontSize: 13, lineHeight: 21, textAlign: "right", fontWeight: "700" },
});
