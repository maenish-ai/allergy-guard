import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import {
  exportBackup,
  exportEncryptedBackup,
  importEncryptedBackup,
  importJsonBackup,
} from "@/lib/backup";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  bg: "#F5FAFB",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  red: "#B23A48",
  paleRed: "#FFF1F2",
};

export default function EmergencyScreen() {
  const { records, profile, saveProfile, replaceData } = useAllergy();
  const [editing, setEditing] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"export" | "import" | null>(
    null,
  );
  const [backupPassword, setBackupPassword] = useState("");
  const allergies = records.filter(
    (item) =>
      item.kind === "medicine-allergy" ||
      item.kind === "food-allergy" ||
      item.kind === "other-allergy",
  );
  const medicines = records.filter((item) => item.kind === "medicine");
  const tolerated = records.filter(
    (item) => item.kind === "medicine-tolerated",
  );
  const [draft, setDraft] = useState(profile);
  const shareCard = async () => {
    const lines = [
      "بطاقة الطوارئ الطبية — حارس الحساسية",
      `الاسم: ${profile.fullName || "غير مسجل"}`,
      `الأدوية المسببة: ${
        allergies
          .filter((r) => r.kind === "medicine-allergy")
          .map(
            (r) =>
              `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
          )
          .join("، ") || "لا يوجد"
      }`,
      `الأطعمة المسببة: ${
        allergies
          .filter((r) => r.kind === "food-allergy")
          .map((r) => r.name)
          .join("، ") || "لا يوجد"
      }`,
      `حساسيات أخرى: ${
        allergies
          .filter((r) => r.kind === "other-allergy")
          .map((r) => `${r.name}${r.severity ? ` (${r.severity})` : ""}`)
          .join("، ") || "لا يوجد"
      }`,
      `الأدوية / العلاجات المسجلة: ${medicines.map((r) => `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`).join("، ") || "لا يوجد"}`,
      `أدوية تم تحملها: ${tolerated.map((r) => `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`).join("، ") || "لا يوجد"}`,
      `جهة الطوارئ: ${profile.emergencyContact || "غير مسجل"}`,
      "هذه المعلومات سجل شخصي وليست تشخيصًا طبيًا.",
    ];
    await Share.share({ message: lines.join("\n") });
  };
  const save = () => {
    saveProfile(draft);
    setEditing(false);
    Alert.alert("تم الحفظ", "تم تحديث بيانات بطاقة الطوارئ.");
  };
  const exportFile = async (format: "json" | "csv") => {
    try {
      await exportBackup(profile, records, format);
    } catch (error) {
      Alert.alert(
        "تعذر التصدير",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    }
  };
  const importFile = async () => {
    try {
      const backup = await importJsonBackup();
      if (!backup) return;
      Alert.alert(
        "استبدال البيانات؟",
        `سيتم استيراد ${backup.records.length} سجلًا واستبدال البيانات الحالية.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استيراد",
            onPress: () => {
              replaceData(backup.records, backup.profile);
              Alert.alert(
                "تم الاستيراد",
                "تمت استعادة النسخة الاحتياطية بنجاح.",
              );
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "تعذر الاستيراد",
        error instanceof Error ? error.message : "الملف غير صالح أو تالف.",
      );
    }
  };
  const submitEncryptedBackup = async () => {
    try {
      if (passwordMode === "export") {
        await exportEncryptedBackup(profile, records, backupPassword);
        Alert.alert("تم التصدير", "تم إنشاء ملف نسخة احتياطية مشفر.");
      } else if (passwordMode === "import") {
        const backup = await importEncryptedBackup(backupPassword);
        if (!backup) return;
        Alert.alert(
          "استبدال البيانات؟",
          `سيتم استيراد ${backup.records.length} سجلًا واستبدال البيانات الحالية.`,
          [
            { text: "إلغاء", style: "cancel" },
            {
              text: "استيراد",
              onPress: () => {
                replaceData(backup.records, backup.profile);
                Alert.alert(
                  "تم الاستيراد",
                  "تمت استعادة النسخة المشفرة بنجاح.",
                );
              },
            },
          ],
        );
      }
      setPasswordMode(null);
      setBackupPassword("");
    } catch (error) {
      Alert.alert(
        passwordMode === "export" ? "تعذر التشفير" : "تعذر فك التشفير",
        error instanceof Error ? error.message : "تحقق من كلمة المرور والملف.",
      );
    }
  };
  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            جاهزة للعرض أمام الطبيب أو الصيدلي
          </Text>
          <Text style={styles.title}>بطاقة الطوارئ</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>حساسية</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>بطاقة الطوارئ الطبية</Text>
              <Text style={styles.cardSub}>
                ملخص الحساسية الدوائية والغذائية
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>تنبيه طبي مهم</Text>
            <Text style={styles.warningText}>
              يرجى التحقق من الاسم التجاري والمادة الفعالة قبل وصف أو صرف أي
              دواء.
            </Text>
          </View>
          <Text style={styles.fieldHeading}>بيانات الشخص</Text>
          <View style={styles.infoGrid}>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>الاسم</Text>
              <Text style={styles.infoValue}>
                {profile.fullName || "غير مسجل"}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>جهة الطوارئ</Text>
              <Text style={styles.infoValue}>
                {profile.emergencyContact || "غير مسجل"}
              </Text>
            </View>
          </View>
          <Text style={styles.fieldHeading}>
            الأدوية أو المواد الفعالة المسببة
          </Text>
          {allergies.filter((r) => r.kind === "medicine-allergy").length ===
          0 ? (
            <Text style={styles.none}>لا توجد سجلات</Text>
          ) : (
            allergies
              .filter((r) => r.kind === "medicine-allergy")
              .map((r) => (
                <View style={styles.item} key={r.id}>
                  <Text style={styles.itemMain}>{r.name}</Text>
                  <Text style={styles.itemSub}>
                    {r.activeIngredient || "المادة الفعالة غير مسجلة"}
                    {r.symptoms ? ` — ${r.symptoms}` : ""}
                  </Text>
                </View>
              ))
          )}
          <Text style={styles.fieldHeading}>الأطعمة أو المكونات المسببة</Text>
          <Text style={styles.foodText}>
            {allergies
              .filter((r) => r.kind === "food-allergy")
              .map((r) => r.name)
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>حساسيات أخرى</Text>
          <Text style={styles.foodText}>
            {allergies
              .filter((r) => r.kind === "other-allergy")
              .map((r) => `${r.name}${r.severity ? ` (${r.severity})` : ""}`)
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>الأدوية / العلاجات المسجلة</Text>
          <Text style={styles.foodText}>
            {medicines
              .map(
                (r) =>
                  `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
              )
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>أدوية تم تحملها دون حساسية</Text>
          <Text style={styles.foodText}>
            {tolerated
              .map(
                (r) =>
                  `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
              )
              .join("، ") || "لا توجد سجلات"}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={shareCard}
            style={({ pressed }) => [styles.share, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.shareText}>مشاركة البطاقة</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDraft(profile);
              setEditing(true);
            }}
            style={styles.edit}
          >
            <Text style={styles.editText}>تعديل البيانات</Text>
          </Pressable>
        </View>
        <View style={styles.backupSection}>
          <Text style={styles.backupTitle}>النسخ الاحتياطي</Text>
          <Text style={styles.backupHint}>
            استخدم النسخة المشفرة للحماية، أو CSV لفتح البيانات في Excel.
          </Text>
          <View style={styles.backupActions}>
            <Pressable
              onPress={() => setPasswordMode("export")}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>تصدير مشفر</Text>
            </Pressable>
            <Pressable
              onPress={() => exportFile("csv")}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>تصدير Excel</Text>
            </Pressable>
            <Pressable
              onPress={() => setPasswordMode("import")}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>استيراد مشفر</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.note}>
          <Text style={styles.noteText}>
            هذه البطاقة سجل شخصي للمعلومات وليست تشخيصًا طبيًا. في حالة صعوبة
            التنفس أو تورم الوجه أو اللسان اتصل بالطوارئ فورًا.
          </Text>
        </View>
        {editing && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>تعديل بيانات البطاقة</Text>
            <TextInput
              value={draft.fullName}
              onChangeText={(value) => setDraft({ ...draft, fullName: value })}
              placeholder="الاسم الكامل"
              placeholderTextColor="#9BAAB3"
              style={styles.input}
              textAlign="right"
            />
            <TextInput
              value={draft.phone}
              onChangeText={(value) => setDraft({ ...draft, phone: value })}
              placeholder="رقم الهاتف"
              placeholderTextColor="#9BAAB3"
              style={styles.input}
              textAlign="right"
              keyboardType="phone-pad"
            />
            <TextInput
              value={draft.emergencyContact}
              onChangeText={(value) =>
                setDraft({ ...draft, emergencyContact: value })
              }
              placeholder="جهة اتصال للطوارئ + الهاتف"
              placeholderTextColor="#9BAAB3"
              style={styles.input}
              textAlign="right"
            />
            <TextInput
              value={draft.doctor}
              onChangeText={(value) => setDraft({ ...draft, doctor: value })}
              placeholder="اسم الطبيب / المنشأة"
              placeholderTextColor="#9BAAB3"
              style={styles.input}
              textAlign="right"
            />
            <Pressable onPress={save} style={styles.save}>
              <Text style={styles.saveText}>حفظ البيانات</Text>
            </Pressable>
          </View>
        )}
        <Modal
          visible={passwordMode !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPasswordMode(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.passwordModal}>
              <Text style={styles.formTitle}>
                {passwordMode === "export"
                  ? "حماية النسخة"
                  : "فتح النسخة المشفرة"}
              </Text>
              <Text style={styles.passwordHint}>
                {passwordMode === "export"
                  ? "أنشئ كلمة مرور من 8 أحرف أو أكثر. ستحتاجها عند الاستعادة."
                  : "أدخل كلمة المرور التي استخدمتها عند التصدير."}
              </Text>
              <TextInput
                value={backupPassword}
                onChangeText={setBackupPassword}
                placeholder="كلمة المرور"
                placeholderTextColor="#9BAAB3"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                textAlign="right"
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setPasswordMode(null);
                    setBackupPassword("");
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>إلغاء</Text>
                </Pressable>
                <Pressable onPress={submitEncryptedBackup} style={styles.save}>
                  <Text style={styles.saveText}>
                    {passwordMode === "export" ? "تشفير ومشاركة" : "فك التشفير"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 28 },
  header: { marginBottom: 16 },
  subtitle: {
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
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: palette.navy,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  cardTitle: {
    color: palette.navy,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
  },
  cardSub: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 14 },
  warning: {
    backgroundColor: palette.paleRed,
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F2CBD0",
  },
  warningTitle: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  warningText: {
    color: "#7D4B52",
    fontSize: 10,
    textAlign: "right",
    lineHeight: 16,
    marginTop: 2,
  },
  fieldHeading: {
    color: palette.teal,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 15,
    marginBottom: 6,
  },
  infoGrid: { flexDirection: "row-reverse", gap: 7 },
  info: { flex: 1, borderRadius: 9, backgroundColor: palette.bg, padding: 9 },
  infoLabel: { color: palette.muted, fontSize: 9, textAlign: "right" },
  infoValue: {
    color: palette.navy,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 4,
  },
  item: {
    borderRightWidth: 3,
    borderRightColor: palette.red,
    backgroundColor: "#FFF7F7",
    padding: 8,
    marginBottom: 5,
    borderRadius: 7,
  },
  itemMain: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  itemSub: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  foodText: {
    color: palette.navy,
    backgroundColor: palette.bg,
    borderRadius: 9,
    padding: 10,
    fontSize: 11,
    textAlign: "right",
    lineHeight: 18,
  },
  none: { color: palette.muted, fontSize: 11, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 14 },
  share: {
    flex: 1,
    backgroundColor: palette.teal,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareText: { color: "white", fontSize: 14, fontWeight: "800" },
  edit: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.teal,
    backgroundColor: palette.card,
  },
  editText: { color: palette.teal, fontSize: 14, fontWeight: "800" },
  backupSection: {
    backgroundColor: palette.card,
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  backupTitle: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  backupHint: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 4,
  },
  backupActions: {
    flexDirection: "row-reverse",
    gap: 6,
    marginTop: 10,
  },
  backupButton: {
    flex: 1,
    backgroundColor: "#EAF5F6",
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  backupButtonText: {
    color: palette.teal,
    fontSize: 10,
    fontWeight: "800",
  },
  note: {
    backgroundColor: "#EAF5F6",
    borderRadius: 13,
    padding: 12,
    marginTop: 12,
  },
  noteText: {
    color: palette.teal,
    fontSize: 10,
    textAlign: "right",
    lineHeight: 17,
  },
  form: {
    backgroundColor: palette.card,
    borderRadius: 17,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
  formTitle: {
    color: palette.navy,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
    borderRadius: 10,
    padding: 11,
    color: palette.navy,
    fontSize: 12,
    marginBottom: 8,
  },
  save: {
    backgroundColor: palette.navy,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: "white", fontSize: 14, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,50,77,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  passwordModal: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
  },
  passwordHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
    marginBottom: 12,
  },
  modalActions: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { color: palette.muted, fontSize: 13, fontWeight: "800" },
});
