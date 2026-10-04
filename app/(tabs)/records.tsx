import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { DatePickerField, formatArabicDate } from "@/components/date-picker-field";
import { FormActionBar } from "@/components/form-action-bar";
import {
  useAllergy,
  type AllergyRecord,
  type RecordKind,
  type Severity,
} from "@/lib/allergy-store";
import { exportRecordsPdf } from "@/lib/pdf-export";
import { exportBackup } from "@/lib/backup";

const C = {
  navy: "#173A57",
  teal: "#087E8B",
  tealSoft: "#E8F6F7",
  bg: "#F4F8FA",
  card: "#FFFFFF",
  line: "#D8E5EA",
  muted: "#607484",
  red: "#B63A49",
  redSoft: "#FFF0F2",
  green: "#197A55",
  greenSoft: "#EAF7F1",
  amber: "#B86A15",
  amberSoft: "#FFF5E8",
  blue: "#3569A8",
  blueSoft: "#EDF4FC",
  purple: "#6F55A3",
  purpleSoft: "#F2EEFA",
  brown: "#7D5A50",
  brownSoft: "#F7F1EF",
};

type FilterKey = "all" | RecordKind;

type KindOption = {
  key: RecordKind;
  label: string;
  description: string;
  icon: string;
  color: string;
  soft: string;
};

const kindOptions: KindOption[] = [
  {
    key: "medicine",
    label: "دواء / علاج",
    description: "اسم الدواء، الجرعة والتكرار",
    icon: "💊",
    color: C.blue,
    soft: C.blueSoft,
  },
  {
    key: "medicine-allergy",
    label: "حساسية دوائية",
    description: "دواء أو مادة فعالة وأعراض الحساسية",
    icon: "⚠️",
    color: C.red,
    soft: C.redSoft,
  },
  {
    key: "food-allergy",
    label: "حساسية غذائية",
    description: "طعام أو مكوّن مسبب للحساسية",
    icon: "🥜",
    color: C.amber,
    soft: C.amberSoft,
  },
  {
    key: "other-allergy",
    label: "حساسية أخرى",
    description: "لاتكس، غبار، حشرات أو أي مسبب آخر",
    icon: "🛡️",
    color: "#A64D79",
    soft: "#FCEEF5",
  },
  {
    key: "chronic-condition",
    label: "مرض مزمن",
    description: "اسم المرض وتاريخ التشخيص والعلاج",
    icon: "❤️",
    color: C.purple,
    soft: C.purpleSoft,
  },
  {
    key: "surgery",
    label: "عملية سابقة",
    description: "اسم العملية والتاريخ والتفاصيل",
    icon: "🏥",
    color: C.brown,
    soft: C.brownSoft,
  },
  {
    key: "medical-note",
    label: "ملاحظة طبية",
    description: "أي معلومة صحية مهمة للمريض",
    icon: "📝",
    color: C.teal,
    soft: C.tealSoft,
  },
  {
    key: "medicine-tolerated",
    label: "دواء متحمّل",
    description: "دواء استُخدم دون حدوث حساسية",
    icon: "✓",
    color: C.green,
    soft: C.greenSoft,
  },
];

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "الكل" },
  ...kindOptions.map(({ key, label }) => ({ key, label })),
];

function optionFor(kind: RecordKind) {
  return kindOptions.find((item) => item.key === kind) ?? kindOptions[6];
}

function labelFor(kind: RecordKind) {
  return optionFor(kind).label;
}

function Field({
  label,
  value,
  onChange,
  placeholder = "اكتب هنا",
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
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
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();

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
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<Severity>("متوسطة");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    return records.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!normalizedQuery) return true;
      return [
        item.name,
        item.activeIngredient,
        item.purpose,
        item.dosage,
        item.frequency,
        item.symptoms,
        item.notes,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("ar").includes(normalizedQuery),
        );
    });
  }, [filter, query, records]);

  const counts = useMemo(() => {
    const result = {} as Record<RecordKind, number>;
    for (const option of kindOptions) {
      result[option.key] = records.filter((record) => record.kind === option.key).length;
    }
    return result;
  }, [records]);

  const resetDraft = (nextKind: RecordKind = "medicine") => {
    setKind(nextKind);
    setName("");
    setActiveIngredient("");
    setPurpose("");
    setDosage("");
    setFrequency("");
    setSymptoms("");
    setSeverity("متوسطة");
    setNotes("");
    setEventDate("");
    setEditingId(null);
  };

  const openAdd = (nextKind: RecordKind = "medicine") => {
    if (!activePatient) {
      Alert.alert(
        "أضف مريضًا أولًا",
        "اذهب إلى تبويب المرضى وأنشئ ملف مريض، ثم ارجع لإضافة معلوماته الصحية.",
      );
      return;
    }
    resetDraft(nextKind);
    setEditorVisible(true);
  };

  const openEdit = (record: AllergyRecord) => {
    setEditingId(record.id);
    setKind(record.kind);
    setName(record.name);
    setActiveIngredient(record.activeIngredient ?? "");
    setPurpose(record.purpose ?? "");
    setDosage(record.dosage ?? "");
    setFrequency(record.frequency ?? "");
    setSymptoms(record.symptoms ?? "");
    setSeverity(record.severity ?? "متوسطة");
    setNotes(record.notes ?? "");
    setEventDate(record.eventDate ?? "");
    setViewRecord(null);
    setEditorVisible(true);
  };

  const save = () => {
    if (!activePatient || saving) return;
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", `أدخل ${nameLabelFor(kind)} أولًا.`);
      return;
    }

    const isAllergy =
      kind === "medicine-allergy" ||
      kind === "food-allergy" ||
      kind === "other-allergy";
    const isMedication =
      kind === "medicine" ||
      kind === "medicine-allergy" ||
      kind === "medicine-tolerated";

    const input = {
      kind,
      name: name.trim(),
      activeIngredient: isMedication ? activeIngredient.trim() : "",
      purpose: purpose.trim(),
      dosage: kind === "medicine" ? dosage.trim() : "",
      frequency: kind === "medicine" ? frequency.trim() : "",
      symptoms: isAllergy ? symptoms.trim() : "",
      severity: isAllergy ? severity : undefined,
      notes: notes.trim(),
      eventDate: eventDate.trim(),
    };

    const savedKind = kind;
    const wasEditing = Boolean(editingId);
    setSaving(true);

    try {
      if (editingId) updateRecord(editingId, input);
      else addRecord(input);

      // Show the saved item immediately even if another filter/search was active.
      setFilter(savedKind);
      setQuery("");
      setEditorVisible(false);
      resetDraft();

      const message = wasEditing ? "تم حفظ التعديلات" : `تم حفظ ${labelFor(savedKind)}`;
      if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert("تم الحفظ", message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = (record: AllergyRecord) =>
    Alert.alert(
      "حذف السجل؟",
      `سيتم حذف «${record.name}» نهائيًا من ملف ${activePatient?.fullName || "المريض"}.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            deleteRecord(record.id);
            if (viewRecord?.id === record.id) setViewRecord(null);
          },
        },
      ],
    );

  const createPdf = async () => {
    if (!activePatient || exporting) return;
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
    if (!activePatient || exporting) return;
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

  const selectedOption = optionFor(kind);
  const isAllergy =
    kind === "medicine-allergy" ||
    kind === "food-allergy" ||
    kind === "other-allergy";
  const isMedication =
    kind === "medicine" ||
    kind === "medicine-allergy" ||
    kind === "medicine-tolerated";

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      style={{ backgroundColor: C.bg }}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.kicker}>ملف صحي قابل للإدارة</Text>
          <Text style={styles.title}>السجلات الصحية</Text>
          <Text style={styles.subtitle}>
            اختَر المريض، وبعدها اضغط على نوع المعلومة التي تريد إضافتها.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.patientChips}
        >
          {patients.length === 0 ? (
            <View style={styles.noPatientChip}>
              <Text style={styles.noPatientText}>أضف مريضًا من تبويب المرضى</Text>
            </View>
          ) : (
            patients.map((patient) => {
              const active = patient.id === activePatient?.id;
              return (
                <Pressable
                  key={patient.id}
                  onPress={() => selectPatient(patient.id)}
                  style={[
                    styles.patientChip,
                    active && styles.patientChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.patientChipText,
                      active && styles.patientChipTextActive,
                    ]}
                  >
                    {patient.fullName || "مريض"}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {activePatient ? (
          <View style={styles.activePatientBanner}>
            <View style={styles.activePatientBadge}>
              <Text style={styles.activePatientBadgeText}>المريض الحالي</Text>
            </View>
            <Text style={styles.activePatientName}>{activePatient.fullName || "مريض"}</Text>
          </View>
        ) : null}

        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHint}>كل بطاقة تفتح نموذج الإضافة مباشرة</Text>
                <Text style={styles.sectionTitle}>إضافة معلومة صحية</Text>
              </View>

              <View style={styles.quickAddGrid}>
                {kindOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => openAdd(option.key)}
                    style={({ pressed }) => [
                      styles.quickAddCard,
                      { backgroundColor: option.soft, borderColor: `${option.color}30` },
                      pressed && styles.quickPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`إضافة ${option.label}`}
                  >
                    <View style={styles.quickTopRow}>
                      <View style={[styles.countPill, { backgroundColor: option.color }]}>
                        <Text style={styles.countText}>{counts[option.key] ?? 0}</Text>
                      </View>
                      <Text style={styles.quickIcon}>{option.icon}</Text>
                    </View>
                    <Text style={[styles.quickTitle, { color: option.color }]}>
                      {option.label}
                    </Text>
                    <Text style={styles.quickDescription}>{option.description}</Text>
                    <View style={[styles.quickAddButton, { backgroundColor: option.color }]}>
                      <Text style={styles.quickAddButtonText}>＋ إضافة</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.exportSection}>
                <Text style={styles.exportSectionTitle}>تقارير المريض</Text>
                <View style={styles.exportActions}>
                  <Pressable
                    onPress={createPdf}
                    disabled={!activePatient || exporting !== null}
                    style={({ pressed }) => [
                      styles.reportButton,
                      pressed && styles.pressed,
                      (!activePatient || exporting !== null) && styles.disabled,
                    ]}
                  >
                    {exporting === "pdf" ? (
                      <ActivityIndicator color={C.teal} size="small" />
                    ) : (
                      <Text style={styles.reportButtonText}>📄 تصدير PDF</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={createCsv}
                    disabled={!activePatient || exporting !== null}
                    style={({ pressed }) => [
                      styles.reportButton,
                      pressed && styles.pressed,
                      (!activePatient || exporting !== null) && styles.disabled,
                    ]}
                  >
                    {exporting === "csv" ? (
                      <ActivityIndicator color={C.teal} size="small" />
                    ) : (
                      <Text style={styles.reportButtonText}>📊 تصدير Excel</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              <Text style={styles.savedTitle}>السجلات المحفوظة</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث باسم الدواء أو الحساسية أو المرض..."
                placeholderTextColor="#98A7B1"
                textAlign="right"
                style={styles.search}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {filters.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[
                      styles.filter,
                      filter === item.key && styles.filterActive,
                    ]}
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
            </>
          }
          renderItem={({ item }) => {
            const option = optionFor(item.kind);
            return (
              <View style={styles.card}>
                <View style={[styles.kindBar, { backgroundColor: option.color }]} />
                <View style={styles.cardBody}>
                  <Text style={[styles.kind, { color: option.color }]}>
                    {option.icon} {labelFor(item.kind)}
                  </Text>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.activeIngredient ? (
                    <Text style={styles.detail}>المادة الفعالة: {item.activeIngredient}</Text>
                  ) : null}
                  {item.dosage || item.frequency ? (
                    <Text style={styles.detail}>
                      {[item.dosage && `الجرعة: ${item.dosage}`, item.frequency && `التكرار: ${item.frequency}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                  {item.purpose ? (
                    <Text style={styles.detail}>التفاصيل: {item.purpose}</Text>
                  ) : null}
                  {item.symptoms ? (
                    <Text style={styles.detail}>
                      الأعراض: {item.symptoms}
                      {item.severity ? ` (${item.severity})` : ""}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={styles.detail} numberOfLines={2}>
                      ملاحظات: {item.notes}
                    </Text>
                  ) : null}
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => setViewRecord(item)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.viewText}>عرض</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openEdit(item)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.editText}>تعديل</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => remove(item)}
                      style={[styles.actionButton, styles.deleteAction]}
                    >
                      <Text style={styles.deleteText}>حذف</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {activePatient ? "لا توجد سجلات مطابقة" : "لا يوجد مريض محدد"}
              </Text>
              <Text style={styles.emptyText}>
                {activePatient
                  ? "استخدم إحدى بطاقات «إضافة معلومة صحية» الموجودة فوق لإضافة أول سجل."
                  : "أنشئ ملف مريض من تبويب المرضى أولًا."}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 28 }} />}
        />
      </View>

      <Modal
        visible={viewRecord !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewRecord(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setViewRecord(null)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
              <Text style={styles.modalTitle}>تفاصيل السجل</Text>
            </View>
            {viewRecord ? (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Detail label="المريض" value={activePatient?.fullName || "—"} />
                <Detail label="النوع" value={labelFor(viewRecord.kind)} />
                <Detail label="الاسم" value={viewRecord.name} />
                {viewRecord.activeIngredient ? (
                  <Detail label="المادة الفعالة" value={viewRecord.activeIngredient} />
                ) : null}
                {viewRecord.dosage ? <Detail label="الجرعة" value={viewRecord.dosage} /> : null}
                {viewRecord.frequency ? <Detail label="التكرار" value={viewRecord.frequency} /> : null}
                {viewRecord.purpose ? (
                  <Detail label="الوصف / العلاج" value={viewRecord.purpose} />
                ) : null}
                {viewRecord.symptoms ? (
                  <Detail label="الأعراض" value={viewRecord.symptoms} />
                ) : null}
                {viewRecord.severity ? (
                  <Detail label="شدة الحساسية" value={viewRecord.severity} />
                ) : null}
                {viewRecord.eventDate ? (
                  <Detail label="التاريخ المرتبط بالسجل" value={formatArabicDate(viewRecord.eventDate)} />
                ) : null}
                {viewRecord.notes ? <Detail label="ملاحظات" value={viewRecord.notes} /> : null}
                <Detail
                  label="تاريخ الإضافة"
                  value={new Date(viewRecord.date).toLocaleString("ar")}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => openEdit(viewRecord)}
                    style={styles.modalEdit}
                  >
                    <Text style={styles.modalEditText}>تعديل السجل</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => remove(viewRecord)}
                    style={styles.modalDelete}
                  >
                    <Text style={styles.modalDeleteText}>حذف</Text>
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
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.editorSheet}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={({ pressed }) => [styles.headerSaveButton, pressed && !saving && styles.pressed, saving && styles.headerSaveDisabled]}
                accessibilityRole="button"
                accessibilityLabel={editingId ? "حفظ التعديلات" : saveActionLabelFor(kind)}
              >
                <Text style={styles.headerSaveButtonText}>{saving ? "..." : "حفظ"}</Text>
              </Pressable>
              <View style={styles.editorHeaderText}>
                <Text style={styles.modalTitle}>
                  {editingId ? `تعديل ${selectedOption.label}` : `إضافة ${selectedOption.label}`}
                </Text>
                <Text style={styles.modalSubtitle}>{selectedOption.description}</Text>
              </View>
              <Pressable onPress={() => setEditorVisible(false)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={[styles.modalContent, styles.editorContent]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            >
              <View style={[styles.selectedKindCard, { backgroundColor: selectedOption.soft }]}> 
                <Text style={styles.selectedKindIcon}>{selectedOption.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedKindTitle, { color: selectedOption.color }]}>
                    {selectedOption.label}
                  </Text>
                  <Text style={styles.selectedKindDescription}>{selectedOption.description}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>تغيير نوع السجل</Text>
              <View style={styles.kindOptionsWrap}>
                {kindOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setKind(option.key)}
                    style={[
                      styles.kindOption,
                      kind === option.key && {
                        backgroundColor: option.color,
                        borderColor: option.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.kindOptionText,
                        kind === option.key && styles.kindOptionTextActive,
                      ]}
                    >
                      {option.icon} {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field
                label={`${nameLabelFor(kind)} *`}
                value={name}
                onChange={setName}
                placeholder={namePlaceholderFor(kind)}
              />

              {isMedication ? (
                <Field
                  label="المادة الفعالة"
                  value={activeIngredient}
                  onChange={setActiveIngredient}
                  placeholder="مثال: Amoxicillin"
                />
              ) : null}

              {kind === "medicine" ? (
                <>
                  <Field
                    label="الجرعة"
                    value={dosage}
                    onChange={setDosage}
                    placeholder="مثال: 500 mg"
                  />
                  <Field
                    label="عدد المرات / التكرار"
                    value={frequency}
                    onChange={setFrequency}
                    placeholder="مثال: مرتان يوميًا بعد الطعام"
                  />
                </>
              ) : null}

              <Field
                label={purposeLabelFor(kind)}
                value={purpose}
                onChange={setPurpose}
                placeholder={purposePlaceholderFor(kind)}
                multiline
              />

              {isAllergy ? (
                <>
                  <Field
                    label="الأعراض التي حصلت"
                    value={symptoms}
                    onChange={setSymptoms}
                    placeholder="مثال: طفح جلدي، ضيق نفس، تورم..."
                    multiline
                  />
                  <Text style={styles.fieldLabel}>شدة الحساسية</Text>
                  <View style={styles.severityRow}>
                    {(["خفيفة", "متوسطة", "شديدة"] as Severity[]).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setSeverity(item)}
                        style={[
                          styles.severityButton,
                          severity === item &&
                            (item === "شديدة"
                              ? styles.severityDanger
                              : styles.severityActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            severity === item && styles.severityTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <DatePickerField
                label={dateLabelFor(kind)}
                value={eventDate}
                onChange={setEventDate}
                placeholder="اختر التاريخ (اختياري)"
                maximumDate={maximumDateFor(kind)}
                helperText="اختيار التاريخ من التقويم يمنع أخطاء الكتابة."
              />
              <Field
                label="ملاحظات إضافية"
                value={notes}
                onChange={setNotes}
                multiline
                placeholder="أي معلومة أخرى مهمة"
              />

            </ScrollView>

            <FormActionBar
              label={editingId ? "حفظ التعديلات" : saveActionLabelFor(kind)}
              onPress={save}
              busy={saving}
              bottomPadding={Math.max(insets.bottom, 18)}
              sticky
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function saveActionLabelFor(kind: RecordKind) {
  switch (kind) {
    case "medicine":
      return "حفظ الدواء";
    case "medicine-allergy":
      return "حفظ الحساسية الدوائية";
    case "food-allergy":
      return "حفظ الحساسية الغذائية";
    case "other-allergy":
      return "حفظ الحساسية";
    case "chronic-condition":
      return "حفظ المرض المزمن";
    case "surgery":
      return "حفظ العملية";
    case "medical-note":
      return "حفظ الملاحظة الطبية";
    case "medicine-tolerated":
      return "حفظ الدواء";
  }
}

function nameLabelFor(kind: RecordKind) {
  switch (kind) {
    case "medicine":
    case "medicine-tolerated":
      return "اسم الدواء / العلاج";
    case "medicine-allergy":
      return "اسم الدواء المسبب للحساسية";
    case "food-allergy":
      return "اسم الطعام / المكوّن";
    case "other-allergy":
      return "اسم مسبب الحساسية";
    case "chronic-condition":
      return "اسم المرض المزمن";
    case "surgery":
      return "اسم العملية";
    case "medical-note":
      return "عنوان الملاحظة";
  }
}

function namePlaceholderFor(kind: RecordKind) {
  switch (kind) {
    case "medicine":
      return "مثال: Metformin";
    case "medicine-allergy":
      return "مثال: Augmentin";
    case "food-allergy":
      return "مثال: الفول السوداني";
    case "other-allergy":
      return "مثال: اللاتكس أو لسعات النحل";
    case "medicine-tolerated":
      return "مثال: Paracetamol";
    case "chronic-condition":
      return "مثال: السكري أو ارتفاع ضغط الدم";
    case "surgery":
      return "مثال: استئصال الزائدة";
    case "medical-note":
      return "مثال: متابعة ضغط الدم";
  }
}

function purposeLabelFor(kind: RecordKind) {
  switch (kind) {
    case "medicine":
      return "سبب الاستخدام";
    case "chronic-condition":
      return "العلاج الحالي / وصف الحالة";
    case "surgery":
      return "تفاصيل العملية / المستشفى";
    case "medical-note":
      return "تفاصيل الملاحظة";
    case "medicine-allergy":
    case "food-allergy":
    case "other-allergy":
      return "تفاصيل عن الحساسية";
    case "medicine-tolerated":
      return "ملاحظات عن استخدام الدواء";
  }
}

function purposePlaceholderFor(kind: RecordKind) {
  switch (kind) {
    case "medicine":
      return "مثال: لعلاج السكري";
    case "chronic-condition":
      return "مثال: مشخص منذ 2022 ويستخدم علاجًا منتظمًا";
    case "surgery":
      return "أي تفاصيل مهمة عن العملية";
    case "medical-note":
      return "اكتب المعلومة الطبية كاملة";
    case "medicine-allergy":
    case "food-allergy":
    case "other-allergy":
      return "متى حصلت؟ وهل احتاجت علاجًا أو طوارئ؟";
    case "medicine-tolerated":
      return "متى استُخدم؟ وأي ملاحظات مهمة";
  }
}

function maximumDateFor(kind: RecordKind) {
  switch (kind) {
    case "chronic-condition":
    case "surgery":
    case "medicine-allergy":
    case "food-allergy":
    case "other-allergy":
      return new Date();
    default:
      return undefined;
  }
}

function dateLabelFor(kind: RecordKind) {
  switch (kind) {
    case "chronic-condition":
      return "تاريخ التشخيص";
    case "surgery":
      return "تاريخ العملية";
    case "medicine":
      return "تاريخ بدء الدواء";
    case "medicine-allergy":
    case "food-allergy":
    case "other-allergy":
      return "تاريخ حدوث الحساسية";
    default:
      return "التاريخ المرتبط بالسجل";
  }
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
  page: { flex: 1, paddingHorizontal: 18 },
  header: { paddingTop: 8, paddingBottom: 10 },
  kicker: { color: C.teal, fontSize: 16, fontWeight: "900", textAlign: "right" },
  title: { color: C.navy, fontSize: 32, fontWeight: "900", textAlign: "right", marginTop: 2 },
  subtitle: { color: C.muted, fontSize: 16, lineHeight: 24, textAlign: "right", marginTop: 5 },
  patientChips: { gap: 9, paddingBottom: 10, flexDirection: "row-reverse" },
  patientChip: { minHeight: 48, borderRadius: 15, paddingHorizontal: 17, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  patientChipActive: { backgroundColor: C.teal, borderColor: C.teal },
  patientChipText: { color: C.navy, fontSize: 16, fontWeight: "900" },
  patientChipTextActive: { color: "#FFF" },
  noPatientChip: { backgroundColor: C.redSoft, borderRadius: 14, padding: 13 },
  noPatientText: { color: C.red, fontSize: 15, fontWeight: "900" },
  activePatientBanner: { minHeight: 52, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14, marginBottom: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activePatientBadge: { backgroundColor: C.tealSoft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  activePatientBadgeText: { color: C.teal, fontSize: 13, fontWeight: "900" },
  activePatientName: { color: C.navy, fontSize: 18, fontWeight: "900", textAlign: "right", flexShrink: 1 },
  list: { paddingBottom: 30 },
  sectionHeaderRow: { marginBottom: 10 },
  sectionTitle: { color: C.navy, fontSize: 22, fontWeight: "900", textAlign: "right" },
  sectionHint: { color: C.muted, fontSize: 14, fontWeight: "600", textAlign: "right", marginBottom: 3 },
  quickAddGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  quickAddCard: { flexBasis: "47%", flexGrow: 1, minHeight: 160, borderRadius: 20, borderWidth: 1, padding: 14, justifyContent: "space-between" },
  quickPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  quickTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickIcon: { fontSize: 28 },
  countPill: { minWidth: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  countText: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  quickTitle: { fontSize: 18, fontWeight: "900", textAlign: "right", marginTop: 7 },
  quickDescription: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "right", marginTop: 4, flexGrow: 1 },
  quickAddButton: { minHeight: 42, borderRadius: 12, marginTop: 10, alignItems: "center", justifyContent: "center" },
  quickAddButtonText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  exportSection: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 14, marginBottom: 18 },
  exportSectionTitle: { color: C.navy, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 10 },
  exportActions: { flexDirection: "row-reverse", gap: 10 },
  reportButton: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: "#F5F9FA", borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  reportButtonText: { color: C.teal, fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  savedTitle: { color: C.navy, fontSize: 22, fontWeight: "900", textAlign: "right", marginBottom: 9 },
  search: { minHeight: 54, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, color: C.navy, fontSize: 17, marginBottom: 10 },
  filters: { gap: 8, paddingBottom: 13, flexDirection: "row-reverse" },
  filter: { minHeight: 44, borderRadius: 999, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF0F3" },
  filterActive: { backgroundColor: C.navy },
  filterText: { color: C.muted, fontSize: 14, fontWeight: "800" },
  filterTextActive: { color: "#FFF" },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginBottom: 13, overflow: "hidden", flexDirection: "row" },
  kindBar: { width: 6 },
  cardBody: { flex: 1, padding: 16 },
  kind: { fontSize: 14, fontWeight: "900", textAlign: "right", marginBottom: 3 },
  name: { color: C.navy, fontSize: 21, fontWeight: "900", textAlign: "right" },
  detail: { color: C.muted, fontSize: 15, lineHeight: 23, textAlign: "right", marginTop: 4 },
  rowActions: { flexDirection: "row-reverse", gap: 8, marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: C.line },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: "#F1F6F8", paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  deleteAction: { backgroundColor: C.redSoft },
  viewText: { color: C.teal, fontSize: 16, fontWeight: "900" },
  editText: { color: C.navy, fontSize: 16, fontWeight: "900" },
  deleteText: { color: C.red, fontSize: 16, fontWeight: "900" },
  emptyCard: { marginTop: 8, backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 25, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: C.navy, fontSize: 21, fontWeight: "900", marginBottom: 8 },
  emptyText: { color: C.muted, fontSize: 16, lineHeight: 25, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(8, 28, 42, 0.50)", justifyContent: "flex-end" },
  detailSheet: { maxHeight: "88%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  editorSheet: { height: "95%", maxHeight: "95%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", position: "relative" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.line, gap: 12 },
  editorHeaderText: { flex: 1, alignItems: "flex-end" },
  close: { color: C.muted, fontSize: 36, lineHeight: 38 },
  modalTitle: { color: C.navy, fontSize: 22, fontWeight: "900", textAlign: "right" },
  modalSubtitle: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "right", marginTop: 2 },
  modalContent: { padding: 20, paddingBottom: 38 },
  editorScroll: { flex: 1 },
  editorContent: { paddingBottom: 150 },
  selectedKindCard: { borderRadius: 18, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 8 },
  selectedKindIcon: { fontSize: 32 },
  selectedKindTitle: { fontSize: 19, fontWeight: "900", textAlign: "right" },
  selectedKindDescription: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "right", marginTop: 2 },
  detailBlock: { backgroundColor: "#F7FAFB", borderRadius: 14, padding: 13, marginBottom: 10 },
  detailLabel: { color: C.muted, fontSize: 13, fontWeight: "700", textAlign: "right" },
  detailValue: { color: C.navy, fontSize: 17, fontWeight: "800", textAlign: "right", marginTop: 4, lineHeight: 25 },
  modalActions: { flexDirection: "row-reverse", gap: 10, marginTop: 10 },
  modalEdit: { flex: 1, minHeight: 54, borderRadius: 15, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" },
  modalEditText: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  modalDelete: { minWidth: 96, minHeight: 54, borderRadius: 15, backgroundColor: C.redSoft, alignItems: "center", justifyContent: "center" },
  modalDeleteText: { color: C.red, fontSize: 17, fontWeight: "900" },
  headerSaveButton: { minWidth: 74, minHeight: 42, borderRadius: 14, backgroundColor: C.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  headerSaveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  headerSaveDisabled: { opacity: 0.55 },
  kindOptionsWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  kindOption: { minHeight: 46, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#EFF4F6", borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  kindOptionText: { color: C.navy, fontSize: 14, fontWeight: "800" },
  kindOptionTextActive: { color: "#FFF" },
  field: { marginTop: 12 },
  fieldLabel: { color: C.navy, fontSize: 16, fontWeight: "900", textAlign: "right", marginTop: 9, marginBottom: 7 },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: "#F8FBFC", borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, color: C.navy, fontSize: 18 },
  multiline: { minHeight: 100, paddingTop: 13, textAlignVertical: "top" },
  severityRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 4 },
  severityButton: { flex: 1, minHeight: 50, borderRadius: 13, backgroundColor: "#EFF4F6", alignItems: "center", justifyContent: "center" },
  severityActive: { backgroundColor: C.navy },
  severityDanger: { backgroundColor: C.red },
  severityText: { color: C.muted, fontSize: 16, fontWeight: "900" },
  severityTextActive: { color: "#FFF" },
});
