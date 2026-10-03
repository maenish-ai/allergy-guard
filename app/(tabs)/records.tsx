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

const C = {
  navy: "#183B56",
  teal: "#0B8793",
  tealSoft: "#E8F6F7",
  bg: "#F4F8FA",
  card: "#FFFFFF",
  line: "#D9E5EA",
  muted: "#607484",
  red: "#B63A49",
  redSoft: "#FFF0F2",
  green: "#197A55",
  amber: "#B86A15",
  blue: "#3569A8",
  purple: "#6F55A3",
};

type FilterKey = "all" | RecordKind;

const kindOptions: Array<{ key: RecordKind; label: string }> = [
  { key: "medicine", label: "دواء / علاج" },
  { key: "medicine-allergy", label: "حساسية دوائية" },
  { key: "food-allergy", label: "حساسية غذائية" },
  { key: "medicine-tolerated", label: "دواء متحمّل" },
  { key: "chronic-condition", label: "مرض مزمن" },
  { key: "surgery", label: "عملية سابقة" },
  { key: "medical-note", label: "ملاحظة طبية" },
];

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "الكل" },
  ...kindOptions,
];

function labelFor(kind: RecordKind) {
  return kindOptions.find((item) => item.key === kind)?.label ?? "سجل صحي";
}

function colorFor(kind: RecordKind) {
  switch (kind) {
    case "medicine-allergy":
      return C.red;
    case "food-allergy":
      return C.amber;
    case "medicine-tolerated":
      return C.green;
    case "medicine":
      return C.blue;
    case "chronic-condition":
      return C.purple;
    case "surgery":
      return "#7D5A50";
    case "medical-note":
      return C.teal;
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder = "اكتب هنا",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#98A7B1"
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlign="right"
      />
    </View>
  );
}

export default function RecordsScreen() {
  const {
    patients,
    activePatient,
    records,
    profile,
    selectPatient,
    addRecord,
    updateRecord,
    deleteRecord,
  } = useAllergy();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [viewRecord, setViewRecord] = useState<AllergyRecord | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<RecordKind>("medicine");
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<Severity>("متوسطة");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const shown = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    return records.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.activeIngredient,
        item.purpose,
        item.symptoms,
        item.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("ar").includes(normalizedQuery));
    });
  }, [filter, query, records]);

  const resetDraft = () => {
    setKind("medicine");
    setName("");
    setActiveIngredient("");
    setPurpose("");
    setSymptoms("");
    setSeverity("متوسطة");
    setNotes("");
    setEventDate("");
    setEditingId(null);
  };

  const openAdd = () => {
    if (!activePatient) {
      Alert.alert("أضف مريضًا أولًا", "اذهب إلى تبويب المرضى وأنشئ ملف مريض، ثم أضف السجلات الصحية.");
      return;
    }
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
    setNotes(record.notes ?? "");
    setEventDate(record.eventDate ?? "");
    setViewRecord(null);
    setEditorVisible(true);
  };

  const save = () => {
    if (!activePatient) return;
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم السجل أولًا.");
      return;
    }

    const isAllergy = kind === "medicine-allergy" || kind === "food-allergy";
    const input = {
      kind,
      name: name.trim(),
      activeIngredient: activeIngredient.trim(),
      purpose: purpose.trim(),
      symptoms: isAllergy ? symptoms.trim() : "",
      severity: isAllergy ? severity : undefined,
      notes: notes.trim(),
      eventDate: eventDate.trim(),
    };

    if (editingId) updateRecord(editingId, input);
    else addRecord(input);

    setEditorVisible(false);
    resetDraft();
  };

  const remove = (record: AllergyRecord) =>
    Alert.alert("حذف السجل؟", `سيتم حذف «${record.name}» نهائيًا من ملف ${activePatient?.fullName || "المريض"}.`, [
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
    if (!activePatient || exporting) return;
    setExporting("pdf");
    try {
      await exportRecordsPdf(profile, records);
    } catch (error) {
      Alert.alert("تعذر إنشاء PDF", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setExporting(null);
    }
  };

  const createCsv = async () => {
    if (!activePatient || exporting) return;
    setExporting("csv");
    try {
      await exportBackup(profile, records, "csv");
    } catch (error) {
      Alert.alert("تعذر تصدير Excel", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setExporting(null);
    }
  };

  const isAllergy = kind === "medicine-allergy" || kind === "food-allergy";

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: C.bg }}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.kicker}>ملف صحي قابل للإدارة</Text>
          <Text style={styles.title}>السجلات الصحية</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientChips}>
          {patients.length === 0 ? (
            <View style={styles.noPatientChip}><Text style={styles.noPatientText}>أضف مريضًا من تبويب المرضى</Text></View>
          ) : (
            patients.map((patient) => {
              const active = patient.id === activePatient?.id;
              return (
                <Pressable key={patient.id} onPress={() => selectPatient(patient.id)} style={[styles.patientChip, active && styles.patientChipActive]}>
                  <Text style={[styles.patientChipText, active && styles.patientChipTextActive]}>{patient.fullName || "مريض"}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.topActions}>
          <Pressable onPress={openAdd} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>＋ إضافة سجل</Text>
          </Pressable>
          <Pressable onPress={createPdf} disabled={!activePatient || exporting !== null} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed, (!activePatient || exporting !== null) && styles.disabled]}>
            {exporting === "pdf" ? <ActivityIndicator color={C.teal} size="small" /> : <Text style={styles.exportText}>PDF</Text>}
          </Pressable>
          <Pressable onPress={createCsv} disabled={!activePatient || exporting !== null} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed, (!activePatient || exporting !== null) && styles.disabled]}>
            {exporting === "csv" ? <ActivityIndicator color={C.teal} size="small" /> : <Text style={styles.exportText}>Excel</Text>}
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="بحث باسم الدواء أو الحساسية أو الملاحظة..."
          placeholderTextColor="#98A7B1"
          textAlign="right"
          style={styles.search}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={shown.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.kindBar, { backgroundColor: colorFor(item.kind) }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.kind}>{labelFor(item.kind)}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                {item.purpose ? <Text style={styles.detail}>الاستخدام: {item.purpose}</Text> : null}
                {item.symptoms ? <Text style={styles.detail}>الأعراض: {item.symptoms}{item.severity ? ` (${item.severity})` : ""}</Text> : null}
                {item.notes ? <Text style={styles.detail} numberOfLines={2}>ملاحظات: {item.notes}</Text> : null}
                <View style={styles.rowActions}>
                  <Pressable onPress={() => setViewRecord(item)} style={styles.actionButton}><Text style={styles.viewText}>عرض</Text></Pressable>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionButton}><Text style={styles.editText}>تعديل</Text></Pressable>
                  <Pressable onPress={() => remove(item)} style={[styles.actionButton, styles.deleteAction]}><Text style={styles.deleteText}>حذف</Text></Pressable>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{activePatient ? "لا توجد سجلات مطابقة" : "لا يوجد مريض محدد"}</Text>
              <Text style={styles.emptyText}>{activePatient ? "اضغط «إضافة سجل» للبدء أو غيّر البحث والتصفية." : "أنشئ ملف مريض من تبويب المرضى أولًا."}</Text>
            </View>
          }
        />
      </View>

      <Modal visible={viewRecord !== null} transparent animationType="fade" onRequestClose={() => setViewRecord(null)}>
        <View style={styles.backdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setViewRecord(null)} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
              <Text style={styles.modalTitle}>تفاصيل السجل</Text>
            </View>
            {viewRecord ? (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Detail label="المريض" value={activePatient?.fullName || "—"} />
                <Detail label="النوع" value={labelFor(viewRecord.kind)} />
                <Detail label="الاسم" value={viewRecord.name} />
                {viewRecord.activeIngredient ? <Detail label="المادة الفعالة" value={viewRecord.activeIngredient} /> : null}
                {viewRecord.purpose ? <Detail label="الاستخدام / الوصف" value={viewRecord.purpose} /> : null}
                {viewRecord.symptoms ? <Detail label="الأعراض" value={viewRecord.symptoms} /> : null}
                {viewRecord.severity ? <Detail label="الشدة" value={viewRecord.severity} /> : null}
                {viewRecord.eventDate ? <Detail label="التاريخ المرتبط بالسجل" value={viewRecord.eventDate} /> : null}
                {viewRecord.notes ? <Detail label="ملاحظات" value={viewRecord.notes} /> : null}
                <Detail label="تاريخ الإضافة" value={new Date(viewRecord.date).toLocaleString("ar")} />
                <View style={styles.modalActions}>
                  <Pressable onPress={() => openEdit(viewRecord)} style={styles.modalEdit}><Text style={styles.modalEditText}>تعديل السجل</Text></Pressable>
                  <Pressable onPress={() => remove(viewRecord)} style={styles.modalDelete}><Text style={styles.modalDeleteText}>حذف</Text></Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.editorSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditorVisible(false)} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
              <Text style={styles.modalTitle}>{editingId ? "تعديل السجل" : "إضافة سجل صحي"}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>نوع السجل</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindOptions}>
                {kindOptions.map((option) => (
                  <Pressable key={option.key} onPress={() => setKind(option.key)} style={[styles.kindOption, kind === option.key && styles.kindOptionActive]}>
                    <Text style={[styles.kindOptionText, kind === option.key && styles.kindOptionTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Field label="الاسم *" value={name} onChange={setName} placeholder="اسم الدواء، الحساسية، المرض أو الملاحظة" />
              {(kind === "medicine" || kind === "medicine-allergy" || kind === "medicine-tolerated") ? <Field label="المادة الفعالة" value={activeIngredient} onChange={setActiveIngredient} /> : null}
              <Field label={kind === "medical-note" ? "العنوان / الوصف" : "الاستخدام / الوصف"} value={purpose} onChange={setPurpose} multiline />
              {isAllergy ? (
                <>
                  <Field label="الأعراض" value={symptoms} onChange={setSymptoms} multiline />
                  <Text style={styles.fieldLabel}>شدة الحساسية</Text>
                  <View style={styles.severityRow}>
                    {(["خفيفة", "متوسطة", "شديدة"] as Severity[]).map((item) => (
                      <Pressable key={item} onPress={() => setSeverity(item)} style={[styles.severityButton, severity === item && styles.severityActive]}>
                        <Text style={[styles.severityText, severity === item && styles.severityTextActive]}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              <Field label="تاريخ مرتبط بالسجل" value={eventDate} onChange={setEventDate} placeholder="YYYY-MM-DD (اختياري)" />
              <Field label="ملاحظات إضافية" value={notes} onChange={setNotes} multiline />
              <Pressable onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                <Text style={styles.saveText}>{editingId ? "حفظ التعديلات" : "إضافة السجل"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 8, paddingBottom: 12 },
  kicker: { color: C.teal, fontSize: 15, fontWeight: "800", textAlign: "right" },
  title: { color: C.navy, fontSize: 31, fontWeight: "900", textAlign: "right" },
  patientChips: { gap: 9, paddingBottom: 12, flexDirection: "row-reverse" },
  patientChip: { minHeight: 44, borderRadius: 14, paddingHorizontal: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  patientChipActive: { backgroundColor: C.teal, borderColor: C.teal },
  patientChipText: { color: C.navy, fontSize: 15, fontWeight: "800" },
  patientChipTextActive: { color: "#FFF" },
  noPatientChip: { backgroundColor: C.redSoft, borderRadius: 14, padding: 12 },
  noPatientText: { color: C.red, fontSize: 14, fontWeight: "800" },
  topActions: { flexDirection: "row-reverse", gap: 9, marginBottom: 12 },
  addButton: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  exportButton: { minWidth: 74, minHeight: 54, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  exportText: { color: C.teal, fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  search: { minHeight: 52, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, color: C.navy, fontSize: 16, marginBottom: 10 },
  filters: { gap: 8, paddingBottom: 12, flexDirection: "row-reverse" },
  filter: { minHeight: 42, borderRadius: 999, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF0F3" },
  filterActive: { backgroundColor: C.navy },
  filterText: { color: C.muted, fontSize: 14, fontWeight: "800" },
  filterTextActive: { color: "#FFF" },
  list: { paddingBottom: 28 },
  emptyList: { flexGrow: 1, paddingBottom: 28 },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginBottom: 13, overflow: "hidden", flexDirection: "row" },
  kindBar: { width: 6 },
  cardBody: { flex: 1, padding: 15 },
  cardTop: { marginBottom: 6 },
  kind: { color: C.teal, fontSize: 13, fontWeight: "800", textAlign: "right", marginBottom: 2 },
  name: { color: C.navy, fontSize: 20, fontWeight: "900", textAlign: "right" },
  detail: { color: C.muted, fontSize: 15, lineHeight: 23, textAlign: "right", marginTop: 3 },
  rowActions: { flexDirection: "row-reverse", gap: 8, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  actionButton: { minHeight: 46, minWidth: 78, borderRadius: 13, backgroundColor: "#F1F6F8", paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  deleteAction: { backgroundColor: C.redSoft },
  viewText: { color: C.teal, fontSize: 15, fontWeight: "900" },
  editText: { color: C.navy, fontSize: 15, fontWeight: "900" },
  deleteText: { color: C.red, fontSize: 15, fontWeight: "900" },
  emptyCard: { flex: 1, marginTop: 20, backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: C.navy, fontSize: 21, fontWeight: "900", marginBottom: 8 },
  emptyText: { color: C.muted, fontSize: 16, lineHeight: 25, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(8, 28, 42, 0.46)", justifyContent: "flex-end" },
  detailSheet: { maxHeight: "86%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  editorSheet: { maxHeight: "94%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  close: { color: C.muted, fontSize: 34, lineHeight: 36 },
  modalTitle: { color: C.navy, fontSize: 21, fontWeight: "900", textAlign: "right" },
  modalContent: { padding: 20, paddingBottom: 36 },
  detailBlock: { backgroundColor: "#F7FAFB", borderRadius: 14, padding: 13, marginBottom: 10 },
  detailLabel: { color: C.muted, fontSize: 13, fontWeight: "700", textAlign: "right" },
  detailValue: { color: C.navy, fontSize: 17, fontWeight: "800", textAlign: "right", marginTop: 4, lineHeight: 25 },
  modalActions: { flexDirection: "row-reverse", gap: 10, marginTop: 10 },
  modalEdit: { flex: 1, minHeight: 52, borderRadius: 15, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" },
  modalEditText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  modalDelete: { minWidth: 90, minHeight: 52, borderRadius: 15, backgroundColor: C.redSoft, alignItems: "center", justifyContent: "center" },
  modalDeleteText: { color: C.red, fontSize: 16, fontWeight: "900" },
  kindOptions: { gap: 8, paddingVertical: 10, flexDirection: "row-reverse" },
  kindOption: { minHeight: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: "#EFF4F6", alignItems: "center", justifyContent: "center" },
  kindOptionActive: { backgroundColor: C.teal },
  kindOptionText: { color: C.navy, fontSize: 14, fontWeight: "800" },
  kindOptionTextActive: { color: "#FFF" },
  field: { marginTop: 12 },
  fieldLabel: { color: C.navy, fontSize: 15, fontWeight: "800", textAlign: "right", marginTop: 8, marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 14, backgroundColor: "#F8FBFC", borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, color: C.navy, fontSize: 17 },
  multiline: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" },
  severityRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 4 },
  severityButton: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: "#EFF4F6", alignItems: "center", justifyContent: "center" },
  severityActive: { backgroundColor: C.navy },
  severityText: { color: C.muted, fontSize: 15, fontWeight: "800" },
  severityTextActive: { color: "#FFF" },
  saveButton: { minHeight: 58, backgroundColor: C.teal, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 22 },
  saveText: { color: "#FFF", fontSize: 18, fontWeight: "900" },
});
