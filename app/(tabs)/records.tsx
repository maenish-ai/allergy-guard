import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy, type RecordKind } from "@/lib/allergy-store";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  bg: "#F5FAFB",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  red: "#B23A48",
  green: "#1B8A5A",
};
const filters: Array<{ key: "all" | RecordKind; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "medicine-allergy", label: "أدوية مسببة" },
  { key: "food-allergy", label: "أطعمة" },
  { key: "medicine-tolerated", label: "متحملة" },
];

export default function RecordsScreen() {
  const { records, deleteRecord } = useAllergy();
  const [filter, setFilter] = useState<"all" | RecordKind>("all");
  const shown = useMemo(
    () =>
      filter === "all"
        ? records
        : records.filter((item) => item.kind === filter),
    [filter, records],
  );
  const labelFor = (kind: RecordKind) =>
    kind === "medicine-tolerated"
      ? "دواء متحمل"
      : kind === "food-allergy"
        ? "طعام / مكوّن"
        : "دواء مسبب للحساسية";
  const remove = (id: string, name: string) =>
    Alert.alert("حذف السجل؟", `سيتم حذف سجل «${name}» من الجهاز.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteRecord(id) },
    ]);

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text style={styles.subtitle}>كل معلوماتك في مكان واحد</Text>
        <Text style={styles.title}>دفتر الحساسية</Text>
      </View>
      <View style={styles.filters}>
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
      </View>
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          shown.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View
              style={[
                styles.kindDot,
                {
                  backgroundColor:
                    item.kind === "medicine-tolerated"
                      ? palette.green
                      : item.kind === "food-allergy"
                        ? "#D78727"
                        : palette.red,
                },
              ]}
            />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.kind}>{labelFor(item.kind)}</Text>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              {item.activeIngredient ? (
                <Text style={styles.detail}>
                  المادة الفعالة: {item.activeIngredient}
                </Text>
              ) : null}
              {item.purpose ? (
                <Text style={styles.detail}>الاستخدام: {item.purpose}</Text>
              ) : null}
              {item.symptoms ? (
                <Text style={styles.detail}>
                  الأعراض: {item.symptoms}{" "}
                  {item.severity ? `(${item.severity})` : ""}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => remove(item.id, item.name)} hitSlop={8}>
              <Text style={styles.trash}>حذف</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌁</Text>
            <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
            <Text style={styles.emptyText}>
              أضف أول سجل من الشاشة الرئيسية.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 20, marginBottom: 16 },
  title: {
    color: palette.navy,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
  },
  subtitle: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 3,
  },
  filters: { flexDirection: "row-reverse", gap: 6, marginBottom: 15 },
  filter: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
  },
  filterActive: { backgroundColor: palette.teal, borderColor: palette.teal },
  filterText: { color: palette.muted, fontSize: 10, fontWeight: "700" },
  filterTextActive: { color: "white" },
  list: { paddingBottom: 25 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: palette.line,
  },
  kindDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
    marginTop: 6,
  },
  body: { flex: 1, alignItems: "flex-end" },
  nameRow: {
    width: "100%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    flex: 1,
    color: palette.navy,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  kind: {
    color: palette.muted,
    fontSize: 10,
    backgroundColor: palette.bg,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    marginRight: 7,
  },
  detail: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 5,
    textAlign: "right",
  },
  trash: {
    color: palette.red,
    fontSize: 10,
    fontWeight: "700",
    marginRight: 10,
    marginTop: 3,
  },
  empty: {
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    padding: 26,
  },
  emptyIcon: { color: palette.teal, fontSize: 36 },
  emptyTitle: {
    color: palette.navy,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  emptyText: { color: palette.muted, fontSize: 12, marginTop: 5 },
});
