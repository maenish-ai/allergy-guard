export type BackupProfile = {
  fullName: string;
  birthDate: string;
  phone: string;
  emergencyContact: string;
  doctor: string;
};

export type BackupRecord = {
  id: string;
  kind: "medicine-allergy" | "food-allergy" | "medicine-tolerated";
  name: string;
  activeIngredient?: string;
  purpose?: string;
  symptoms?: string;
  severity?: "خفيفة" | "متوسطة" | "شديدة";
  date: string;
};

export type BackupPayload = {
  schemaVersion: 1;
  exportedAt: string;
  app: "allergy-guard";
  profile: BackupProfile;
  records: BackupRecord[];
};

type BackupInput = {
  profile?: unknown;
  records?: unknown;
  schemaVersion?: unknown;
  app?: unknown;
};

function isRecord(value: unknown): value is BackupRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BackupRecord>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.date === "string" &&
    ["medicine-allergy", "food-allergy", "medicine-tolerated"].includes(
      item.kind ?? "",
    )
  );
}

export function validateBackup(value: unknown): BackupPayload {
  if (!value || typeof value !== "object")
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  const input = value as BackupInput;
  if (
    input.app !== "allergy-guard" ||
    input.schemaVersion !== 1 ||
    !Array.isArray(input.records) ||
    !input.records.every(isRecord)
  ) {
    throw new Error("هذا الملف ليس نسخة احتياطية صالحة من حارس الحساسية.");
  }
  const profile =
    input.profile && typeof input.profile === "object"
      ? (input.profile as BackupProfile)
      : {
          fullName: "",
          birthDate: "",
          phone: "",
          emergencyContact: "",
          doctor: "",
        };
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "allergy-guard",
    profile,
    records: input.records,
  };
}
