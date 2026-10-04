import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";

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
  greenSoft: "#EAF7F1",
  blue: "#3569A8",
  blueSoft: "#EDF4FC",
};

function Stat({ value, label, tint }: { value: number; label: string; tint: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  title,
  description,
  background,
  color,
  onPress,
}: {
  title: string;
  description: string;
  background: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionCard, { backgroundColor: background }, pressed && styles.pressed]}>
      <View style={[styles.actionDot, { backgroundColor: color }]} />
      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, { color }]}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Text style={[styles.arrow, { color }]}>‹</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { patients, activePatient, records } = useAllergy();

  const allergies = records.filter((r) => r.kind === "medicine-allergy" || r.kind === "food-allergy" || r.kind === "other-allergy").length;
  const medicines = records.filter((r) => r.kind === "medicine").length;
  const chronic = records.filter((r) => r.kind === "chronic-condition").length;

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={{ backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.brand}>حارس الحساسية</Text>
          <Text style={styles.heroTitle}>ملفك الصحي والعائلي في مكان واحد</Text>
          <Text style={styles.heroText}>رتّب المرضى والحساسيات والأدوية والسجلات المهمة، وصدّر تقريرًا عند الحاجة.</Text>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>المريض الحالي</Text>
          <Text style={styles.currentName}>{activePatient?.fullName || "لم يتم اختيار مريض"}</Text>
          <Text style={styles.currentMeta}>
            {activePatient
              ? `${records.length} سجل صحي${activePatient.bloodType ? ` · فصيلة الدم ${activePatient.bloodType}` : ""}`
              : "أضف مريضًا للبدء"}
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/patients" as any)} style={styles.switchButton}>
            <Text style={styles.switchText}>{activePatient ? "تغيير / إدارة المرضى" : "إضافة مريض"}</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat value={allergies} label="حساسيات" tint={C.red} />
          <Stat value={medicines} label="أدوية" tint={C.blue} />
          <Stat value={chronic} label="أمراض مزمنة" tint={C.green} />
        </View>

        <Text style={styles.sectionTitle}>وصول سريع</Text>
        <ActionCard
          title="السجلات الصحية"
          description="إضافة، عرض، تعديل، حذف، بحث وتصدير PDF"
          background={C.tealSoft}
          color={C.teal}
          onPress={() => router.push("/(tabs)/records" as any)}
        />
        <ActionCard
          title="بطاقة الطوارئ"
          description="معلومات مهمة وسريعة للمريض المحدد"
          background={C.redSoft}
          color={C.red}
          onPress={() => router.push("/(tabs)/emergency" as any)}
        />
        <ActionCard
          title="المرضى وأفراد العائلة"
          description={`${patients.length} ملف محفوظ على هذا الجهاز`}
          background={C.greenSoft}
          color={C.green}
          onPress={() => router.push("/(tabs)/patients" as any)}
        />
        <ActionCard
          title="التحديث والنسخ الاحتياطي"
          description="الإصدار الحالي وخيارات التحديث"
          background={C.blueSoft}
          color={C.blue}
          onPress={() => router.push("/(tabs)/settings" as any)}
        />

        <View style={styles.note}>
          <Text style={styles.noteTitle}>خصوصية محلية أولًا</Text>
          <Text style={styles.noteText}>البيانات محفوظة على الجهاز حاليًا. بنية التخزين أصبحت مفصولة عن الواجهات حتى نقدر نضيف مزامنة سحابية مستقبلًا بدون إعادة بناء التطبيق من الصفر.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 34 },
  hero: { paddingTop: 8, marginBottom: 18 },
  brand: { color: C.teal, fontSize: 16, fontWeight: "900", textAlign: "right" },
  heroTitle: { color: C.navy, fontSize: 30, lineHeight: 39, fontWeight: "900", textAlign: "right", marginTop: 4 },
  heroText: { color: C.muted, fontSize: 16, lineHeight: 26, textAlign: "right", marginTop: 8 },
  currentCard: { backgroundColor: C.navy, borderRadius: 24, padding: 20, marginBottom: 14 },
  currentLabel: { color: "#A9DDE1", fontSize: 14, fontWeight: "800", textAlign: "right" },
  currentName: { color: "#FFF", fontSize: 25, fontWeight: "900", textAlign: "right", marginTop: 4 },
  currentMeta: { color: "#D7E5EA", fontSize: 15, lineHeight: 23, textAlign: "right", marginTop: 5 },
  switchButton: { alignSelf: "flex-end", marginTop: 14, minHeight: 46, borderRadius: 14, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  switchText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  statsRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 22 },
  stat: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 13, fontWeight: "800", marginTop: 2 },
  sectionTitle: { color: C.navy, fontSize: 20, fontWeight: "900", textAlign: "right", marginBottom: 10 },
  actionCard: { minHeight: 92, borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  actionDot: { width: 12, height: 12, borderRadius: 6 },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 18, fontWeight: "900", textAlign: "right" },
  actionDescription: { color: C.muted, fontSize: 14, lineHeight: 22, textAlign: "right", marginTop: 3 },
  arrow: { fontSize: 34, fontWeight: "300" },
  pressed: { opacity: 0.78 },
  note: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 17, marginTop: 4 },
  noteTitle: { color: C.navy, fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 5 },
  noteText: { color: C.muted, fontSize: 14, lineHeight: 23, textAlign: "right" },
});
