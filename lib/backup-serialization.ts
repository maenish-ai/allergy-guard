import type { AllergyRecord, Profile } from "./allergy-store";
import type { BackupPayload } from "./backup-format";

export function makeBackupPayload(
  profile: Profile,
  records: AllergyRecord[],
): BackupPayload {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "allergy-guard",
    profile,
    records,
  };
}

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function csvRows(payload: BackupPayload) {
  const header = [
    "النوع",
    "الاسم",
    "المادة الفعالة",
    "الاستخدام",
    "الأعراض",
    "الشدة",
    "التاريخ",
  ];
  const rows = payload.records.map((record) => [
    record.kind === "medicine-allergy"
      ? "دواء مسبب للحساسية"
      : record.kind === "food-allergy"
        ? "طعام أو مكوّن"
        : record.kind === "medicine"
          ? "دواء / علاج"
          : "دواء متحمّل",
    record.name,
    record.activeIngredient,
    record.purpose,
    record.symptoms,
    record.severity,
    record.date,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n")
  );
}
