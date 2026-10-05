import Constants from "expo-constants";
import { useEffect, useMemo, useState } from "react";
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
  connectEmailProvider,
  disconnectEmailProvider,
  getEmailConnectionStatus,
  providerSupportsDirectMailbox,
  type EmailConnectionStatus,
} from "@/lib/email-account";
import {
  emailEncryptedBackupNow,
  hasBackupPassword,
  loadEmailBackupPreferences,
  providerLabels,
  saveEmailBackupPreferences,
  syncDailyBackupReminder,
  type EmailProvider,
} from "@/lib/email-backup";
import { syncAutoEmailBackupTask } from "@/lib/auto-email-backup";
import {
  restoreLatestBackupFromConnectedAccount,
  sendEncryptedBackupThroughConnectedAccount,
} from "@/lib/email-mailbox";

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
  danger: "#A63B46",
  success: "#197A55",
  successBg: "#EAF7F1",
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

function backupPatientCount(data: unknown) {
  if (!data || typeof data !== "object") return 0;
  const patients = (data as { patients?: unknown }).patients;
  return Array.isArray(patients) ? patients.length : 0;
}

export default function SettingsScreen() {
  const { checkNow } = useGithubUpdater({ autoCheck: false });
  const { restoreSnapshot } = useAllergy();
  const [checking, setChecking] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAlreadySet, setPasswordAlreadySet] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [lastPreparedAt, setLastPreparedAt] = useState<string | undefined>();
  const [lastSentAt, setLastSentAt] = useState<string | undefined>();
  const [savingBackupSettings, setSavingBackupSettings] = useState(false);
  const [sendingBackup, setSendingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<EmailConnectionStatus | null>(null);
  const version = Constants.expoConfig?.version ?? "غير معروف";

  const directSupported = providerSupportsDirectMailbox(provider);
  const directReady = Boolean(directSupported && connection?.configured && connection?.connected);

  const connectionLabel = useMemo(() => {
    if (!connection) return "جاري فحص حالة الربط...";
    if (connection.connected) return `مرتبط: ${connection.email || "تم ربط الحساب"}`;
    if (!connection.supported) return connection.reason || "الربط المباشر غير متاح لهذا المزود.";
    if (!connection.configured) return connection.reason || "يلزم إعداد OAuth في نسخة التطبيق.";
    return "الحساب غير مرتبط بعد.";
  }, [connection]);

  const refreshConnection = async (selectedProvider = provider) => {
    const status = await getEmailConnectionStatus(selectedProvider);
    setConnection(status);
    return status;
  };

  useEffect(() => {
    (async () => {
      const [prefs, hasPassword] = await Promise.all([
        loadEmailBackupPreferences(),
        hasBackupPassword(),
      ]);
      setProvider(prefs.provider);
      setEmail(prefs.email);
      setDailyReminder(prefs.dailyReminder);
      setAutoBackup(prefs.autoBackup);
      setLastPreparedAt(prefs.lastPreparedAt);
      setLastSentAt(prefs.lastSentAt);
      setPasswordAlreadySet(hasPassword);
      await refreshConnection(prefs.provider);
    })().catch((error) => console.warn("Failed to load backup settings:", error));
  }, []);

  useEffect(() => {
    refreshConnection(provider).catch((error) =>
      console.warn("Failed to refresh email connection:", error),
    );
  }, [provider]);

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
      const shouldEnableAuto = autoBackup && directReady;
      const saved = await saveEmailBackupPreferences(
        {
          provider,
          email,
          dailyReminder,
          autoBackup: shouldEnableAuto,
          lastPreparedAt,
          lastSentAt,
        },
        password || undefined,
      );
      await Promise.all([
        syncDailyBackupReminder(saved.dailyReminder),
        syncAutoEmailBackupTask(saved.autoBackup),
      ]);
      setEmail(saved.email);
      setAutoBackup(saved.autoBackup);
      setPassword("");
      setPasswordAlreadySet(true);
      if (showConfirmation) {
        Alert.alert(
          "تم الحفظ",
          saved.autoBackup
            ? "تم حفظ الإعدادات وتفعيل محاولة النسخ التلقائي في الخلفية كل 24 ساعة تقريبًا."
            : "تم حفظ إعدادات النسخ الاحتياطي بالبريد.",
        );
      }
      return true;
    } catch (error) {
      Alert.alert("تعذر الحفظ", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      return false;
    } finally {
      setSavingBackupSettings(false);
    }
  };

  const connectSelectedProvider = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const result = await connectEmailProvider(provider);
      const status = await refreshConnection(provider);
      if (!email.trim() && result.email) setEmail(result.email);
      Alert.alert("تم ربط البريد", `تم ربط ${providerLabels[provider]} بالحساب ${status.email || result.email}.`);
    } catch (error) {
      Alert.alert("تعذر ربط البريد", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSelectedProvider = () => {
    Alert.alert("فصل حساب البريد؟", "سيتم حذف رموز الدخول المحفوظة بأمان من هذا الجهاز فقط.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "فصل الحساب",
        style: "destructive",
        onPress: async () => {
          await disconnectEmailProvider(provider);
          setAutoBackup(false);
          await syncAutoEmailBackupTask(false);
          await refreshConnection(provider);
        },
      },
    ]);
  };

  const sendBackupNow = async (direct: boolean) => {
    if (sendingBackup) return;
    const saved = await persistBackupSettings(false);
    if (!saved) return;
    setSendingBackup(true);
    try {
      if (direct) {
        const result = await sendEncryptedBackupThroughConnectedAccount(provider);
        setLastPreparedAt(result.lastPreparedAt);
        setLastSentAt(result.lastSentAt);
        Alert.alert("تم الإرسال", "تم إرسال النسخة المشفرة مباشرة من الحساب المرتبط.");
      } else {
        const result = await emailEncryptedBackupNow();
        setLastPreparedAt(result.lastPreparedAt);
      }
    } catch (error) {
      Alert.alert(
        "تعذر إرسال النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setSendingBackup(false);
    }
  };

  const restoreLatest = async () => {
    if (restoringBackup) return;
    setRestoringBackup(true);
    try {
      const result = await restoreLatestBackupFromConnectedAccount(provider);
      const patientCount = backupPatientCount(result.payload.data);
      const backupDate = formatDate(result.payload.exportedAt || result.receivedAt);
      Alert.alert(
        "استرجاع النسخة من البريد؟",
        `تم العثور على نسخة بتاريخ ${backupDate} وتحتوي على ${patientCount} ملف مريض. الاسترجاع سيستبدل البيانات الحالية الموجودة على هذا الجهاز.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استرجاع الآن",
            style: "destructive",
            onPress: () => {
              try {
                restoreSnapshot(result.payload.data);
                Alert.alert("تم الاسترجاع", "تم استرجاع المرضى والسجلات من آخر نسخة بريد مشفرة.");
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
        "تعذر استرجاع النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setRestoringBackup(false);
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
            يحفظ التطبيق نسخة مشفرة من جميع المرضى والسجلات. Gmail وOutlook/Hotmail يدعمان الإرسال والاسترجاع المباشر بعد ربط الحساب رسميًا. Yahoo والبريد الآخر يبقيان متاحين عبر تطبيق البريد بدون تخزين كلمة مرور البريد.
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

          <View style={[styles.connectionBox, connection?.connected && styles.connectionBoxConnected]}>
            <Text style={[styles.connectionTitle, connection?.connected && styles.connectionTitleConnected]}>
              {connection?.connected ? "✓ الحساب مرتبط" : "ربط الحساب الرسمي"}
            </Text>
            <Text style={styles.connectionText}>{connectionLabel}</Text>
            {connection?.redirectUri && directSupported ? (
              <Text selectable style={styles.redirectText}>Redirect URI: {connection.redirectUri}</Text>
            ) : null}
          </View>

          {directSupported ? (
            connection?.connected ? (
              <Pressable onPress={disconnectSelectedProvider} style={styles.disconnectButton}>
                <Text style={styles.disconnectButtonText}>فصل الحساب المرتبط</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={connectSelectedProvider}
                disabled={connecting}
                style={({ pressed }) => [
                  styles.connectButton,
                  pressed && styles.buttonPressed,
                  connecting && styles.buttonDisabled,
                ]}
              >
                {connecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>ربط حساب {providerLabels[provider]}</Text>
                )}
              </Pressable>
            )
          ) : null}

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
            هذه ليست كلمة مرور بريدك. هي فقط مفتاح تشفير ملف النسخة الاحتياطية، وتُحفظ بأمان على الجهاز.
          </Text>

          <View style={styles.switchRow}>
            <Switch
              value={autoBackup && directReady}
              onValueChange={setAutoBackup}
              disabled={!directReady}
              trackColor={{ false: "#C9D2D7", true: "#8FD1D5" }}
              thumbColor={autoBackup && directReady ? palette.teal : "#F4F4F4"}
            />
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>إرسال تلقائي كل 24 ساعة تقريبًا</Text>
              <Text style={styles.switchText}>
                يحتاج حساب Gmail أو Outlook مرتبطًا. Android يحدد وقت تشغيل المهمة في الخلفية، لذلك قد لا تكون بالدقيقة نفسها.
              </Text>
            </View>
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
              <Text style={styles.switchText}>مفيد خصوصًا لـ Yahoo والبريد الآخر عندما تستخدم الإرسال اليدوي.</Text>
            </View>
          </View>

          <View style={styles.lastRow}>
            <View style={styles.lastBlock}>
              <Text style={styles.lastLabel}>آخر إرسال مباشر</Text>
              <Text style={styles.lastValue}>{formatDate(lastSentAt)}</Text>
            </View>
            <View style={styles.lastBlock}>
              <Text style={styles.lastLabel}>آخر نسخة مجهزة</Text>
              <Text style={styles.lastValue}>{formatDate(lastPreparedAt)}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => persistBackupSettings(true)}
            disabled={savingBackupSettings || sendingBackup || restoringBackup}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              (savingBackupSettings || sendingBackup || restoringBackup) && styles.buttonDisabled,
            ]}
          >
            {savingBackupSettings ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>حفظ إعدادات النسخ الاحتياطي</Text>
            )}
          </Pressable>

          {directReady ? (
            <>
              <Pressable
                onPress={() => sendBackupNow(true)}
                disabled={sendingBackup || restoringBackup}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  (sendingBackup || restoringBackup) && styles.buttonDisabled,
                ]}
              >
                {sendingBackup ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>إرسال نسخة مشفرة الآن مباشرة</Text>
                )}
              </Pressable>

              <Pressable
                onPress={restoreLatest}
                disabled={restoringBackup || sendingBackup}
                style={({ pressed }) => [
                  styles.restoreButton,
                  pressed && styles.buttonPressed,
                  (restoringBackup || sendingBackup) && styles.buttonDisabled,
                ]}
              >
                {restoringBackup ? (
                  <ActivityIndicator color={palette.navy} />
                ) : (
                  <Text style={styles.restoreButtonText}>استرجاع آخر نسخة من البريد</Text>
                )}
              </Pressable>
            </>
          ) : null}

          <Pressable
            onPress={() => sendBackupNow(false)}
            disabled={sendingBackup || savingBackupSettings || restoringBackup}
            style={({ pressed }) => [
              styles.manualButton,
              pressed && styles.buttonPressed,
              (sendingBackup || savingBackupSettings || restoringBackup) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.manualButtonText}>إرسال يدوي عبر تطبيق البريد</Text>
          </Pressable>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              لا تُخزن كلمة مرور Gmail أو Outlook أو Yahoo داخل التطبيق. الربط المباشر يستخدم OAuth ورموز وصول محفوظة في SecureStore. Yahoo لا يتيح Mail REST عامة لهذا الاستخدام من تطبيق محمول بلا خادم وسيط، لذلك يبقى مساره يدويًا بدل تخزين سر الحساب داخل التطبيق.
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
  kicker: { color: palette.teal, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 3 },
  title: { color: palette.navy, fontSize: 28, fontWeight: "800", textAlign: "right", marginBottom: 18 },
  card: { backgroundColor: palette.card, borderRadius: 20, borderWidth: 1, borderColor: palette.line, padding: 18, marginBottom: 16 },
  cardTitle: { color: palette.navy, fontSize: 19, fontWeight: "800", textAlign: "right", marginBottom: 8 },
  cardText: { color: palette.muted, fontSize: 14, lineHeight: 23, textAlign: "right", marginBottom: 18 },
  label: { color: palette.navy, fontSize: 14, fontWeight: "800", textAlign: "right", marginBottom: 7, marginTop: 4 },
  providerGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 15 },
  providerButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: "#F7FAFB", alignItems: "center", justifyContent: "center" },
  providerButtonActive: { backgroundColor: palette.tealSoft, borderColor: palette.teal, borderWidth: 2 },
  providerText: { color: palette.muted, fontSize: 13, fontWeight: "800" },
  providerTextActive: { color: palette.teal },
  connectionBox: { borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: "#F8FBFC", padding: 13, marginBottom: 10 },
  connectionBoxConnected: { borderColor: "#BBDDCB", backgroundColor: palette.successBg },
  connectionTitle: { color: palette.navy, fontSize: 14, fontWeight: "900", textAlign: "right" },
  connectionTitleConnected: { color: palette.success },
  connectionText: { color: palette.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 4 },
  redirectText: { color: palette.muted, fontSize: 10, lineHeight: 16, textAlign: "left", marginTop: 7 },
  connectButton: { minHeight: 50, borderRadius: 14, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginBottom: 14 },
  disconnectButton: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: "#E7C3C7", backgroundColor: "#FFF5F6", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  disconnectButtonText: { color: palette.danger, fontSize: 14, fontWeight: "900" },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: "#FAFCFD", color: palette.navy, paddingHorizontal: 14, fontSize: 15, marginBottom: 13 },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: -5, marginBottom: 12 },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, marginTop: 3, marginBottom: 8 },
  switchTextWrap: { flex: 1 },
  switchTitle: { color: palette.navy, fontSize: 15, fontWeight: "800", textAlign: "right" },
  switchText: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "right", marginTop: 2 },
  lastRow: { flexDirection: "row-reverse", gap: 10, marginTop: 12, marginBottom: 14 },
  lastBlock: { flex: 1, borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 10, backgroundColor: "#FAFCFD" },
  lastLabel: { color: palette.muted, fontSize: 11, fontWeight: "700", textAlign: "right" },
  lastValue: { color: palette.navy, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 4 },
  versionRow: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 14, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelInline: { color: palette.muted, fontSize: 14 },
  version: { color: palette.navy, fontSize: 15, fontWeight: "800" },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 10 },
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 2, borderColor: palette.teal, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: palette.teal, fontSize: 14, fontWeight: "900", textAlign: "center" },
  restoreButton: { minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: palette.navy, backgroundColor: "#F4F8FB", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 10 },
  restoreButtonText: { color: palette.navy, fontSize: 15, fontWeight: "900", textAlign: "center" },
  manualButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: "#F7FAFB", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 10 },
  manualButtonText: { color: palette.navy, fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "center" },
  securityNote: { marginTop: 14, backgroundColor: palette.warningBg, borderRadius: 12, padding: 12 },
  securityNoteText: { color: palette.warning, fontSize: 12, lineHeight: 20, textAlign: "right", fontWeight: "700" },
  note: { borderRadius: 14, backgroundColor: palette.tealSoft, padding: 14 },
  noteText: { color: palette.teal, fontSize: 13, lineHeight: 21, textAlign: "right" },
});
