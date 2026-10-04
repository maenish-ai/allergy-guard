import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { DatePickerField, formatArabicDate } from "@/components/date-picker-field";
import { FormActionBar } from "@/components/form-action-bar";
import {
  emptyProfile,
  useAllergy,
  type Patient,
  type Profile,
} from "@/lib/allergy-store";

const C = {
  navy: "#183B56",
  teal: "#0B8793",
  tealSoft: "#E8F6F7",
  bg: "#F4F8FA",
  card: "#FFFFFF",
  line: "#D9E5EA",
  muted: "#607484",
  danger: "#B63A49",
  dangerSoft: "#FFF0F2",
  green: "#197A55",
};

function Input({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#98A7B1"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlign="right"
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const systemBottomClearance = Platform.OS === "android" ? Math.max(insets.bottom, 48) : Math.max(insets.bottom, 12);
  const {
    patients,
    activePatientId,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
  } = useAllergy();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Profile>({ ...emptyProfile });

  const activeName = useMemo(
    () => patients.find((p) => p.id === activePatientId)?.fullName || "لا يوجد مريض محدد",
    [patients, activePatientId],
  );

  const openAdd = () => {
    setEditingId(null);
    setDraft({ ...emptyProfile });
    setModalVisible(true);
  };

  const openEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setDraft({
      fullName: patient.fullName,
      birthDate: patient.birthDate,
      phone: patient.phone,
      emergencyContact: patient.emergencyContact,
      doctor: patient.doctor,
      gender: patient.gender ?? "",
      bloodType: patient.bloodType ?? "",
      notes: patient.notes ?? "",
    });
    setModalVisible(true);
  };

  const save = () => {
    if (!draft.fullName.trim()) {
      Alert.alert("الاسم مطلوب", "اكتب اسم المريض قبل الحفظ.");
      return;
    }
    const cleaned = { ...draft, fullName: draft.fullName.trim() };
    if (editingId) {
      updatePatient(editingId, cleaned);
      Alert.alert("تم الحفظ", "تم تحديث بيانات المريض.");
    } else {
      addPatient(cleaned);
      Alert.alert("تمت الإضافة", "تم إنشاء ملف المريض واختياره تلقائيًا.");
    }
    setModalVisible(false);
  };

  const remove = (patient: Patient) => {
    Alert.alert(
      "حذف المريض؟",
      `سيتم حذف ملف ${patient.fullName || "المريض"} وكل سجلاته الصحية من هذا الجهاز.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف نهائي",
          style: "destructive",
          onPress: () => deletePatient(patient.id),
        },
      ],
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={openAdd} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>＋ إضافة مريض</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>ملفات العائلة</Text>
            <Text style={styles.title}>المرضى</Text>
          </View>
        </View>

        <View style={styles.activeBanner}>
          <Text style={styles.activeLabel}>المريض الحالي</Text>
          <Text style={styles.activeName}>{activeName}</Text>
        </View>

        {patients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا يوجد مرضى بعد</Text>
            <Text style={styles.emptyText}>أضف أول مريض، ثم ابدأ بإدخال الحساسية والأدوية والسجلات الصحية الخاصة به.</Text>
            <Pressable onPress={openAdd} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>إضافة أول مريض</Text>
            </Pressable>
          </View>
        ) : (
          patients.map((patient) => {
            const active = patient.id === activePatientId;
            return (
              <View key={patient.id} style={[styles.patientCard, active && styles.patientCardActive]}>
                <Pressable onPress={() => selectPatient(patient.id)} style={styles.patientMain}>
                  <View style={[styles.avatar, active && styles.avatarActive]}>
                    <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                      {(patient.fullName.trim()[0] || "م").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <View style={styles.nameLine}>
                      {active ? <Text style={styles.activeChip}>محدد</Text> : null}
                      <Text style={styles.patientName}>{patient.fullName || "بدون اسم"}</Text>
                    </View>
                    <Text style={styles.patientMeta}>
                      {patient.bloodType ? `فصيلة ${patient.bloodType} · ` : ""}
                      {patient.birthDate ? `${formatArabicDate(patient.birthDate)} · ` : ""}
                      {patient.records.length} سجل صحي
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  <Pressable onPress={() => selectPatient(patient.id)} style={styles.actionButton}>
                    <Text style={styles.selectText}>اختيار</Text>
                  </Pressable>
                  <Pressable onPress={() => openEdit(patient)} style={styles.actionButton}>
                    <Text style={styles.editText}>تعديل</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(patient)} style={[styles.actionButton, styles.deleteButton]}>
                    <Text style={styles.deleteText}>حذف</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.backdrop, { paddingBottom: systemBottomClearance }]}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable
                onPress={save}
                style={({ pressed }) => [styles.headerSaveButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={editingId ? "حفظ التعديلات" : "حفظ المريض"}
              >
                <Text style={styles.headerSaveButtonText}>حفظ</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{editingId ? "تعديل بيانات المريض" : "إضافة مريض جديد"}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <Input label="الاسم الكامل *" value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} placeholder="مثال: أحمد محمد" />
              <View style={styles.twoColumns}>
                <View style={styles.half}>
                  <Input label="فصيلة الدم" value={draft.bloodType ?? ""} onChange={(v) => setDraft({ ...draft, bloodType: v })} placeholder="A+" />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>الجنس</Text>
                  <View style={styles.genderRow}>
                    {(["ذكر", "أنثى"] as const).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setDraft({ ...draft, gender: value })}
                        style={[styles.genderButton, draft.gender === value && styles.genderButtonActive]}
                      >
                        <Text style={[styles.genderText, draft.gender === value && styles.genderTextActive]}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <DatePickerField
                label="تاريخ الميلاد"
                value={draft.birthDate}
                onChange={(v) => setDraft({ ...draft, birthDate: v })}
                placeholder="اختر تاريخ الميلاد"
                maximumDate={new Date()}
                helperText="لا يمكن اختيار تاريخ ميلاد في المستقبل."
              />
              <Input label="رقم الهاتف" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} placeholder="07xxxxxxxx" keyboardType="phone-pad" />
              <Input label="جهة اتصال للطوارئ" value={draft.emergencyContact} onChange={(v) => setDraft({ ...draft, emergencyContact: v })} placeholder="الاسم + الهاتف" />
              <Input label="الطبيب / المنشأة" value={draft.doctor} onChange={(v) => setDraft({ ...draft, doctor: v })} placeholder="اختياري" />
              <Input label="ملاحظات" value={draft.notes ?? ""} onChange={(v) => setDraft({ ...draft, notes: v })} placeholder="أي معلومات إضافية" multiline />
            </ScrollView>
            <FormActionBar
              label={editingId ? "حفظ التعديلات" : "حفظ المريض"}
              onPress={save}
              bottomPadding={18}
              sticky
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 6, marginBottom: 18 },
  headerText: { flex: 1 },
  kicker: { color: C.teal, fontSize: 15, fontWeight: "800", textAlign: "right" },
  title: { color: C.navy, fontSize: 32, fontWeight: "900", textAlign: "right" },
  primaryButton: { backgroundColor: C.teal, minHeight: 52, borderRadius: 16, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  activeBanner: { backgroundColor: C.tealSoft, borderColor: "#C7E7EA", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  activeLabel: { color: C.teal, fontSize: 13, fontWeight: "800", textAlign: "right" },
  activeName: { color: C.navy, fontSize: 20, fontWeight: "900", textAlign: "right", marginTop: 3 },
  patientCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginBottom: 14, padding: 15 },
  patientCardActive: { borderColor: C.teal, borderWidth: 2 },
  patientMain: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#EEF3F6", alignItems: "center", justifyContent: "center" },
  avatarActive: { backgroundColor: C.teal },
  avatarText: { color: C.navy, fontSize: 22, fontWeight: "900" },
  avatarTextActive: { color: "#FFF" },
  patientInfo: { flex: 1 },
  nameLine: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  patientName: { color: C.navy, fontSize: 20, fontWeight: "900", textAlign: "right" },
  activeChip: { color: C.green, backgroundColor: "#EAF7F1", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontSize: 12, fontWeight: "900" },
  patientMeta: { color: C.muted, fontSize: 14, fontWeight: "600", textAlign: "right", marginTop: 5 },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 14, paddingTop: 12, borderTopColor: C.line, borderTopWidth: 1 },
  actionButton: { minHeight: 44, minWidth: 76, paddingHorizontal: 14, borderRadius: 13, backgroundColor: "#F2F6F8", alignItems: "center", justifyContent: "center" },
  deleteButton: { backgroundColor: C.dangerSoft },
  selectText: { color: C.teal, fontSize: 15, fontWeight: "900" },
  editText: { color: C.navy, fontSize: 15, fontWeight: "900" },
  deleteText: { color: C.danger, fontSize: 15, fontWeight: "900" },
  emptyCard: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 24, alignItems: "center" },
  emptyTitle: { color: C.navy, fontSize: 22, fontWeight: "900", marginBottom: 8 },
  emptyText: { color: C.muted, fontSize: 16, lineHeight: 26, textAlign: "center" },
  emptyButton: { marginTop: 18, backgroundColor: C.teal, minHeight: 52, borderRadius: 15, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  backdrop: { flex: 1, backgroundColor: "rgba(10, 30, 45, 0.45)", justifyContent: "flex-end" },
  sheet: { height: "92%", maxHeight: "92%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, overflow: "hidden", position: "relative" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetTitle: { flex: 1, color: C.navy, fontSize: 21, fontWeight: "900", textAlign: "center" },
  headerSaveButton: { minWidth: 74, minHeight: 42, borderRadius: 14, backgroundColor: C.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  headerSaveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  close: { color: C.muted, fontSize: 34, fontWeight: "500", lineHeight: 38 },
  formScroll: { flex: 1 },
  form: { padding: 20, paddingBottom: 150 },
  field: { marginBottom: 14 },
  label: { color: C.navy, fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 7 },
  input: { minHeight: 52, backgroundColor: "#F8FBFC", borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, color: C.navy, fontSize: 17 },
  multiline: { minHeight: 96, paddingTop: 13, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  genderRow: { flexDirection: "row-reverse", gap: 7 },
  genderButton: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: "#F8FBFC", borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  genderButtonActive: { backgroundColor: C.teal, borderColor: C.teal },
  genderText: { color: C.navy, fontSize: 16, fontWeight: "800" },
  genderTextActive: { color: "#FFF" },
});
