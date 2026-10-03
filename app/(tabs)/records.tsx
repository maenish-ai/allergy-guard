import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  type AllergyRecord,
  type RecordKind,
  type Severity,
} from "@/lib/allergy-store";
import { exportRecordsPdf } from "@/lib/pdf-export";
import { exportBackup } from "@/lib/backup";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  bg: "#F5FAFB",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  red: "#B23A48",
  green: "#1B8A5A",
  amber: "#D78727",
  blue: "#3568A8",
};

const filters: Array<{ key: "all" | RecordKind; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "medicine", label: "الأدوية" },
  { key: "medicine-allergy", label: "حساسية دوائية" },
  { key: "food-allergy", label: "حساسية غذائية" },
  { key: "medicine-tolerated", label: "أدوية متحمّلة" },
];

const kindOptions: Array<{ key: RecordKind; label: string }> = [
  { key: "medicine", label: "دواء / علاج" },
  { key: "medicine-allergy", label: "حساسية دوائية" },
  { key: "food-allergy", label: "حساسية غذائية" },
  { key: "medicine-tolerated", label: "دواء متحمّل" },
];

const labelFor = (kind: RecordKind) => {
  switch (kind) {
    case "medicine":
      return "دواء / علاج";
    case "medicine-tolerated":
      return "دواء متحمّل";
    case "food-allergy":
      return "حساسية غذائية";
    case "medicine-allergy":
      return "حساسية دوائية";
  }
};

const colorFor = (kind: RecordKind) => {
  switch (kind) {
    case "medicine":
      return palette.blue;
    case "medicine-tolerated":
      return palette.green;
    case "food-allergy":
      return palette.amber;
    case "medicine-allergy":
      return palette.red;
  }
};

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

export default function RecordsScreen() {
  const { records, profile, addRecord, updateRecord, deleteRecord } = useAllergy();
  const [filter, setFilter] = useState<"all" | RecordKind>("all");
  const [viewRecord, setViewRecord] = useState<AllergyRecord | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<RecordKind>("medicine");
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<Severity>("متوسطة");
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const shown = useMemo(
    () =>
      filter === "all"
        ? records
        : records.filter((item) => item.kind === filter),
    [filter, records],
  );

  const resetDraft = () => {
    setKind("medicine");
    setName("");
    setActiveIngredient("");
    setPurpose("");
    setSymptoms("");
    setSeverity("متوسطة");
    setEditingId(null);
  };

  const openAdd = () => {
    resetDraft();
    setEditorVisible(true);
  };

  const openEdit = (record: AllergyRecord) => {
    setEditingId(record.id);
    setKind(record.kind);
    setName(record.name);
    setActiveIngredient(record.activeIngredient ?? "");
    setPurpose(record.purpose ?? "");
    setSymptoms(record.symptoms ?? "");
    setSeverity(record.severity ?? "متوسطة");
    setViewRecord(null);
    setEditorVisible(true);
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم الدواء أو المادة المسببة للحساسية.");
      return;
    }

    const allergyKind = kind === "medicine-allergy" || kind === "food-allergy";
    const input = {
      kind,
      name: name.trim(),
      activeIngredient:
        kind === "food-allergy" ? "" : activeIngredient.trim(),
      purpose: purpose.trim(),
      symptoms: allergyKind ? symptoms.trim() : "",
      severity: allergyKind ? severity : undefined,
    };

    if (editingId) {
      updateRecord(editingId, input);
      Alert.alert("تم التعديل", "تم تحديث السجل بنجاح.");
    } else {
      addRecord(input);
      Alert.alert("تمت الإضافة", "تم حفظ السجل على الجهاز.");
    }

    setEditorVisible(false);
    resetDraft();
  };

  const remove = (record: AllergyRecord) =>
    Alert.alert("حذف السجل؟", `سيتم حذف سجل «${record.name}» نهائيًا من الجهاز.`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          deleteRecord(record.id);
          if (viewRecord?.id === record.id) setViewRecord(null);
        },
      },
    ]);

  const createPdf = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      await exportRecordsPdf(profile, records);
    } catch (error) {
      Alert.alert(
        "تعذر إنشاء PDF",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setExporting(null);
    }
  };

  const createCsv = async () => {
    if (exporting) return;
    setExporting("csv");
    try {
      await exportBackup(profile, records, "csv");
    } catch (error) {
      Alert.alert(
        "تعذر تصدير Excel",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setExporting(null);
    }
  };

  const isAllergy = kind === "medicine-allergy" || kind === "food-allergy";

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text style={styles.subtitle}>إضافة، عرض، تعديل، حذف وتصدير</Text>
        <Text style={styles.title}>السجلات الصحية</Text>
      </View>

      <View style={styles.topActions}>
        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addButtonText}>＋ إضافة سجل</Text>
        </Pressable>
        <Pressable
          onPress={createPdf}
          disabled={exporting !== null}
          style={({ pressed }) => [
            styles.pdfButton,
            pressed && styles.pressed,
            exporting !== null && styles.disabled,
          ]}
        >
          {exporting === "pdf" ? (
            <ActivityIndicator color={palette.teal} size="small" />
          ) : (
            <Text style={styles.pdfButtonText}>PDF</Text>
          )}
        </Pressable>
        <Pressable
          onPress={createCsv}
          disabled={exporting !== null}
          style={({ pressed }) => [
            styles.pdfButton,
            pressed && styles.pressed,
            exporting !== null && styles.disabled,
          ]}
        >
          {exporting === "csv" ? (
            <ActivityIndicator color={palette.teal} size="small" />
          ) : (
            <Text style={styles.pdfButtonText}>Excel</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setFilter(item.key)}
            style={[styles.filter, filter === item.key && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={shown.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.kindDot, { backgroundColor: colorFor(item.kind) }]} />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.kind}>{labelFor(item.kind)}</Text>
              </View>
              {item.activeIngredient ? (
                <Text style={styles.detail}>المادة الفعالة: {item.activeIngredient}</Text>
              ) : null}
              {item.purpose ? (
                <Text style={styles.detail}>الاستخدام: {item.purpose}</Text>
              ) : null}
              {item.symptoms ? (
                <Text style={styles.detail} numberOfLines={2}>
                  الأعراض: {item.symptoms}{item.severity ? ` (${item.severity})` : ""}
                </Text>
              ) : null}
              <View style={styles.rowActions}>
                <Pressable onPress={() => setViewRecord(item)} style={styles.smallAction}>
                  <Text style={styles.viewText}>عرض</Text>
                </Pressable>
                <Pressable onPress={() => openEdit(item)} style={styles.smallAction}>
                  <Text style={styles.editText}>تعديل</Text>
                </Pressable>
                <Pressable onPress={() => remove(item)} style={styles.smallAction}>
                  <Text style={styles.deleteText}>حذف</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌁</Text>
            <Text style={styles.emptyTitle}>لا توجد سجلات</Text>
            <Text style={styles.emptyText}>اضغط «إضافة سجل» لإضافة دواء أو حساسية.</Text>
          </View>
        }
      />

      <Modal
        visible={viewRecord !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewRecord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailsModal}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setViewRecord(null)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
              <Text style={styles.modalTitle}>تفاصيل السجل</Text>
            </View>
            {viewRecord ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>النوع</Text>
                  <Text style={styles.detailValue}>{labelFor(viewRecord.kind)}</Text>
                </View>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>الاسم</Text>
                  <Text style={styles.detailValue}>{viewRecord.name}</Text>
                </View>
                {viewRecord.activeIngredient ? (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>المادة الفعالة</Text>
                    <Text style={styles.detailValue}>{viewRecord.activeIngredient}</Text>
                  </View>
                ) : null}
                {viewRecord.purpose ? (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>الاستخدام</Text>
                    <Text style={styles.detailValue}>{viewRecord.purpose}</Text>
                  </View>
                ) : null}
                {viewRecord.symptoms ? (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>الأعراض</Text>
                    <Text style={styles.detailValue}>{viewRecord.symptoms}</Text>
                  </View>
                ) : null}
                {viewRecord.severity ? (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>الشدة</Text>
                    <Text style={styles.detailValue}>{viewRecord.severity}</Text>
                  </View>
                ) : null}
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>تاريخ الإضافة</Text>
                  <Text style={styles.detailValue}>
                    {new Date(viewRecord.date).toLocaleString("ar")}
                  </Text>
                </View>
                <View style={styles.detailsActions}>
                  <Pressable onPress={() => openEdit(viewRecord)} style={styles.detailsEditButton}>
                    <Text style={styles.detailsEditText}>تعديل السجل</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(viewRecord)} style={styles.detailsDeleteButton}>
                    <Text style={styles.detailsDeleteText}>حذف</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editorModal}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditorVisible(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{editingId ? "تعديل السجل" : "إضافة سجل"}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>نوع السجل</Text>
              <View style={styles.kindGrid}>
                {kindOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setKind(option.key)}
                    style={[styles.kindOption, kind === option.key && styles.kindOptionActive]}
                  >
                    <Text
                      style={[
                        styles.kindOptionText,
                        kind === option.key && styles.kindOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field
                label={kind === "food-allergy" ? "اسم الطعام أو المكوّن" : "اسم الدواء"}
                value={name}
                onChange={setName}
              />
              {kind !== "food-allergy" ? (
                <Field
                  label="المادة الفعالة"
                  value={activeIngredient}
                  onChange={setActiveIngredient}
                />
              ) : null}
              <Field label="الاستخدام / ملاحظات" value={purpose} onChange={setPurpose} multiline />

              {isAllergy ? (
                <>
                  <Field label="الأعراض التي ظهرت" value={symptoms} onChange={setSymptoms} multiline />
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>شدة التفاعل</Text>
                  <View style={styles.severityRow}>
                    {(["خفيفة", "متوسطة", "شديدة"] as Severity[]).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setSeverity(item)}
                        style={[styles.severity, severity === item && styles.severityActive]}
                      >
                        <Text style={[styles.severityText, severity === item && styles.whiteText]}>
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Pressable onPress={save} style={styles.saveButton}>
                <Text style={styles.saveText}>{editingId ? "حفظ التعديلات" : "إضافة السجل"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 20, marginBottom: 13 },
  title: { color: palette.navy, fontSize: 28, fontWeight: "800", textAlign: "right" },
  subtitle: { color: palette.teal, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 3 },
  topActions: { flexDirection: "row-reverse", gap: 8, marginBottom: 12 },
  addButton: { flex: 1, minHeight: 46, backgroundColor: palette.teal, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "white", fontSize: 14, fontWeight: "800" },
  pdfButton: { width: 76, minHeight: 46, backgroundColor: palette.card, borderRadius: 13, borderWidth: 1, borderColor: palette.teal, alignItems: "center", justifyContent: "center" },
  pdfButtonText: { color: palette.teal, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  filters: { flexDirection: "row-reverse", gap: 6, paddingBottom: 13 },
  filter: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line, alignItems: "center" },
  filterActive: { backgroundColor: palette.teal, borderColor: palette.teal },
  filterText: { color: palette.muted, fontSize: 10, fontWeight: "700" },
  filterTextActive: { color: "white" },
  list: { paddingBottom: 25 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 },
  card: { flexDirection: "row-reverse", alignItems: "flex-start", backgroundColor: palette.card, borderRadius: 16, padding: 14, marginBottom: 9, borderWidth: 1, borderColor: palette.line },
  kindDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 10, marginTop: 6 },
  body: { flex: 1, alignItems: "flex-end" },
  nameRow: { width: "100%", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  name: { flex: 1, color: palette.navy, fontSize: 15, fontWeight: "800", textAlign: "right" },
  kind: { color: palette.muted, fontSize: 10, backgroundColor: palette.bg, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, marginRight: 7 },
  detail: { color: palette.muted, fontSize: 11, marginTop: 5, textAlign: "right" },
  rowActions: { flexDirection: "row-reverse", gap: 7, marginTop: 12, width: "100%" },
  smallAction: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.line },
  viewText: { color: palette.teal, fontSize: 11, fontWeight: "800" },
  editText: { color: palette.blue, fontSize: 11, fontWeight: "800" },
  deleteText: { color: palette.red, fontSize: 11, fontWeight: "800" },
  empty: { backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.line, alignItems: "center", padding: 26 },
  emptyIcon: { color: palette.teal, fontSize: 36 },
  emptyTitle: { color: palette.navy, fontSize: 16, fontWeight: "800", marginTop: 6 },
  emptyText: { color: palette.muted, fontSize: 12, marginTop: 5, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,35,51,0.48)", justifyContent: "flex-end" },
  editorModal: { maxHeight: "90%", backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  detailsModal: { maxHeight: "82%", backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { color: palette.navy, fontSize: 20, fontWeight: "800", textAlign: "right" },
  close: { color: palette.muted, fontSize: 30, lineHeight: 32, paddingHorizontal: 4 },
  field: { marginTop: 10 },
  fieldLabel: { color: palette.muted, fontSize: 12, fontWeight: "700", textAlign: "right", marginBottom: 6 },
  input: { backgroundColor: palette.card, borderColor: palette.line, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: palette.navy, fontSize: 13, minHeight: 44 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  kindGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 4 },
  kindOption: { width: "48%", minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  kindOptionActive: { backgroundColor: palette.teal, borderColor: palette.teal },
  kindOptionText: { color: palette.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  kindOptionTextActive: { color: "white" },
  severityRow: { flexDirection: "row-reverse", gap: 7 },
  severity: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center" },
  severityActive: { backgroundColor: palette.teal, borderColor: palette.teal },
  severityText: { color: palette.muted, fontSize: 11, fontWeight: "700" },
  whiteText: { color: "white" },
  saveButton: { marginTop: 18, minHeight: 48, borderRadius: 13, backgroundColor: palette.teal, alignItems: "center", justifyContent: "center" },
  saveText: { color: "white", fontSize: 14, fontWeight: "800" },
  detailBlock: { backgroundColor: palette.card, borderRadius: 12, borderWidth: 1, borderColor: palette.line, padding: 12, marginBottom: 8 },
  detailLabel: { color: palette.muted, fontSize: 10, textAlign: "right", marginBottom: 4 },
  detailValue: { color: palette.navy, fontSize: 14, fontWeight: "700", textAlign: "right", lineHeight: 22 },
  detailsActions: { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  detailsEditButton: { flex: 1, minHeight: 46, backgroundColor: palette.teal, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  detailsEditText: { color: "white", fontSize: 13, fontWeight: "800" },
  detailsDeleteButton: { width: 82, minHeight: 46, backgroundColor: "#FFF1F2", borderRadius: 12, borderWidth: 1, borderColor: "#F2C6CC", alignItems: "center", justifyContent: "center" },
  detailsDeleteText: { color: palette.red, fontSize: 13, fontWeight: "800" },
});
