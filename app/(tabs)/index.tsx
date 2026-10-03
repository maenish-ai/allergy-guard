import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import {
  useAllergy,
  type RecordKind,
  type Severity,
} from "@/lib/allergy-store";

const colors = {
  navy: "#17324D",
  teal: "#087E8B",
  bg: "#F5FAFB",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  danger: "#B23A48",
  dangerBg: "#FFF1F2",
  green: "#1B8A5A",
};

function StatCard({
  value,
  label,
  tint,
}: {
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: tint }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="اكتب هنا"
        placeholderTextColor="#9BAAB3"
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlign="right"
      />
    </View>
  );
}

export default function HomeScreen() {
  const { records, addRecord } = useAllergy();
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState<RecordKind>("medicine-allergy");
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<Severity>("متوسطة");

  const reset = () => {
    setName("");
    setActiveIngredient("");
    setPurpose("");
    setSymptoms("");
    setSeverity("متوسطة");
  };
  const save = () => {
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "اكتب اسم الطعام أو الدواء أولًا.");
      return;
    }
    const allergyKind = kind === "medicine-allergy" || kind === "food-allergy";
    addRecord({
      kind,
      name: name.trim(),
      activeIngredient: kind === "food-allergy" ? "" : activeIngredient.trim(),
      purpose: purpose.trim(),
      symptoms: allergyKind ? symptoms.trim() : "",
      severity: allergyKind ? severity : undefined,
    });
    reset();
    setVisible(false);
    Alert.alert("تم الحفظ", "أضيف السجل إلى دفتر الحساسية.");
  };
  const allergies = records.filter(
    (record) =>
      record.kind === "medicine-allergy" || record.kind === "food-allergy",
  );
  const medicines = records.filter((record) => record.kind === "medicine");
  const tolerated = records.filter(
    (record) => record.kind === "medicine-tolerated",
  );

  return (
    <ScreenContainer
      containerClassName="bg-background"
      className="px-5"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>سجل صحي شخصي</Text>
            <Text style={styles.title}>حارس الحساسية</Text>
          </View>
          <View style={styles.shield}>
            <Text style={styles.shieldText}>✓</Text>
          </View>
        </View>
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>تنبيه مهم</Text>
          <Text style={styles.alertText}>
            هذا التطبيق يساعدك على تنظيم معلوماتك، ولا يغني عن استشارة الطبيب أو
            الصيدلي.
          </Text>
        </View>
        <View style={styles.stats}>
          <StatCard
            value={
              allergies.filter((r) => r.kind === "medicine-allergy").length
            }
            label="حساسية دوائية"
            tint={colors.danger}
          />
          <StatCard
            value={allergies.filter((r) => r.kind === "food-allergy").length}
            label="حساسية غذائية"
            tint="#D78727"
          />
          <StatCard
            value={medicines.length}
            label="أدوية مسجلة"
            tint="#3568A8"
          />
          <StatCard
            value={tolerated.length}
            label="أدوية متحملة"
            tint={colors.green}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => setVisible(true)}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.primaryText}>إضافة سجل جديد</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>آخر السجلات</Text>
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>لا توجد سجلات بعد</Text>
            <Text style={styles.emptyText}>
              ابدأ بإضافة دواء، علاج، أو حساسية جديدة.
            </Text>
          </View>
        ) : (
          records.slice(0, 3).map((record) => (
            <View style={styles.recordCard} key={record.id}>
              <View
                style={[
                  styles.recordDot,
                  {
                    backgroundColor:
                      record.kind === "medicine-tolerated"
                        ? colors.green
                        : record.kind === "medicine"
                          ? "#3568A8"
                          : record.kind === "food-allergy"
                            ? "#D78727"
                            : colors.danger,
                  },
                ]}
              />
              <View style={styles.recordBody}>
                <Text style={styles.recordName}>{record.name}</Text>
                <Text style={styles.recordMeta}>
                  {record.activeIngredient ||
                    (record.kind === "food-allergy"
                      ? "مكوّن غذائي"
                      : "بدون مادة فعالة مسجلة")}
                </Text>
              </View>
              <Text style={styles.recordTag}>
                {record.kind === "medicine-tolerated"
                  ? "متحمّل"
                  : record.kind === "food-allergy"
                    ? "غذاء"
                    : record.kind === "medicine"
                      ? "علاج"
                      : "حساسية دوائية"}
              </Text>
            </View>
          ))
        )}
        <View style={styles.tip}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            احتفظ ببطاقة الطوارئ معك وشاركها مع الطبيب عند الحاجة.
          </Text>
        </View>
      </ScrollView>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setVisible(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
              <Text style={styles.modalTitle}>إضافة سجل جديد</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>نوع السجل</Text>
              <View style={styles.segment}>
                <Pressable
                  onPress={() => setKind("medicine-allergy")}
                  style={[
                    styles.segmentItem,
                    kind === "medicine-allergy" && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === "medicine-allergy" && styles.segmentTextActive,
                    ]}
                  >
                    دواء سبب حساسية
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setKind("food-allergy")}
                  style={[
                    styles.segmentItem,
                    kind === "food-allergy" && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === "food-allergy" && styles.segmentTextActive,
                    ]}
                  >
                    طعام / مكوّن
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setKind("medicine")}
                  style={[
                    styles.segmentItem,
                    kind === "medicine" && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === "medicine" && styles.segmentTextActive,
                    ]}
                  >
                    دواء / علاج
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setKind("medicine-tolerated")}
                  style={[
                    styles.segmentItem,
                    kind === "medicine-tolerated" && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === "medicine-tolerated" && styles.segmentTextActive,
                    ]}
                  >
                    دواء متحمّل
                  </Text>
                </Pressable>
              </View>
              <Field
                label={
                  kind === "food-allergy"
                    ? "اسم الطعام أو المكوّن"
                    : "الاسم التجاري للدواء"
                }
                value={name}
                onChange={setName}
              />
              {kind !== "food-allergy" && (
                <Field
                  label="المادة الفعالة"
                  value={activeIngredient}
                  onChange={setActiveIngredient}
                />
              )}
              <Field label="الاستخدام" value={purpose} onChange={setPurpose} />
              {(kind === "medicine-allergy" || kind === "food-allergy") && (
                <>
                  <Field
                    label="الأعراض التي ظهرت"
                    value={symptoms}
                    onChange={setSymptoms}
                    multiline
                  />
                  <Text style={styles.label}>شدة التفاعل</Text>
                  <View style={styles.severityRow}>
                    {(["خفيفة", "متوسطة", "شديدة"] as Severity[]).map(
                      (item) => (
                        <Pressable
                          key={item}
                          onPress={() => setSeverity(item)}
                          style={[
                            styles.severity,
                            severity === item && {
                              backgroundColor:
                                item === "شديدة" ? colors.danger : colors.teal,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.severityText,
                              severity === item && styles.whiteText,
                            ]}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                </>
              )}
              <Pressable style={styles.saveButton} onPress={save}>
                <Text style={styles.saveText}>حفظ السجل</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 28 },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 2,
  },
  shield: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.teal,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  shieldText: { color: "white", fontSize: 28, fontWeight: "800" },
  alert: {
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F2CBD0",
  },
  alertTitle: {
    color: colors.danger,
    fontWeight: "800",
    textAlign: "right",
    fontSize: 14,
  },
  alertText: {
    color: "#7D4B52",
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    marginTop: 3,
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderTopWidth: 3,
    alignItems: "center",
    shadowColor: "#16324F",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: 15,
    height: 54,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.teal,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  plus: { color: "white", fontSize: 24, lineHeight: 26 },
  primaryText: { color: "white", fontSize: 16, fontWeight: "800" },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 24,
    marginBottom: 10,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: { color: colors.teal, fontSize: 30 },
  emptyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    minHeight: 70,
    padding: 13,
    marginBottom: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  recordDot: { width: 11, height: 11, borderRadius: 6, marginLeft: 11 },
  recordBody: { flex: 1, alignItems: "flex-end" },
  recordName: { color: colors.navy, fontSize: 14, fontWeight: "800" },
  recordMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  recordTag: {
    color: colors.muted,
    fontSize: 11,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#EAF5F6",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  tipIcon: { fontSize: 17 },
  tipText: {
    flex: 1,
    color: colors.teal,
    fontSize: 11,
    textAlign: "right",
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 31, 48, 0.45)",
  },
  modal: {
    maxHeight: "92%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C0D0D5",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  close: { color: colors.muted, fontSize: 28 },
  label: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 7,
    marginTop: 10,
  },
  segment: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginBottom: 6 },
  segmentItem: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  segmentText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentTextActive: { color: "white" },
  field: { marginTop: 8 },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.navy,
    fontSize: 13,
    minHeight: 43,
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  severityRow: { flexDirection: "row-reverse", gap: 7 },
  severity: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    alignItems: "center",
  },
  severityText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  whiteText: { color: "white" },
  saveButton: {
    backgroundColor: colors.navy,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  saveText: { color: "white", fontSize: 15, fontWeight: "800" },
});
