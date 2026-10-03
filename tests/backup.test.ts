import { describe, expect, it } from "vitest";
import {
  decryptBackupPayload,
  encryptBackupPayload,
  isEncryptedBackup,
} from "../lib/backup-crypto";
import { csvRows, makeBackupPayload } from "../lib/backup-serialization";
import { validateBackup } from "../lib/backup-format";

const profile = {
  fullName: "أحمد",
  birthDate: "1990-01-01",
  phone: "0500000000",
  emergencyContact: "الأسرة",
  doctor: "د. سامي",
};

const records = [
  {
    id: "1",
    kind: "medicine-allergy" as const,
    name: "دواء, تجريبي",
    activeIngredient: "مادة فعالة",
    purpose: "مسكن",
    symptoms: "طفح",
    severity: "شديدة" as const,
    date: "2026-01-01T00:00:00.000Z",
  },
];

describe("local backup export and import", () => {
  it("creates a valid JSON payload for local export", () => {
    const payload = makeBackupPayload(profile, records);
    const restored = validateBackup(JSON.parse(JSON.stringify(payload)));
    expect(restored.app).toBe("allergy-guard");
    expect(restored.records[0].name).toBe("دواء, تجريبي");
  });

  it("exports CSV with UTF-8 BOM and escapes commas", () => {
    const csv = csvRows(makeBackupPayload(profile, records));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"دواء, تجريبي"');
    expect(csv).toContain("المادة الفعالة");
  });

  it("encrypts and imports a backup with the correct password", async () => {
    const payload = makeBackupPayload(profile, records);
    const encrypted = await encryptBackupPayload(payload, "كلمة-مرور-قوية");
    expect(isEncryptedBackup(JSON.parse(encrypted))).toBe(true);
    const restored = await decryptBackupPayload(encrypted, "كلمة-مرور-قوية");
    expect(restored.records).toEqual(payload.records);
    expect(restored.profile.fullName).toBe("أحمد");
  });

  it("rejects a wrong password and tampered encrypted file", async () => {
    const encrypted = await encryptBackupPayload(
      makeBackupPayload(profile, records),
      "كلمة-مرور-قوية",
    );
    await expect(
      decryptBackupPayload(encrypted, "كلمة-مرور-خاطئة"),
    ).rejects.toThrow("تعذر فك النسخة");
    const tampered = encrypted.replace(
      /"ciphertext": "([^"])/,
      '"ciphertext": "X$1',
    );
    await expect(
      decryptBackupPayload(tampered, "كلمة-مرور-قوية"),
    ).rejects.toThrow("تعذر فك النسخة");
  });

  it("rejects passwords shorter than eight characters", async () => {
    await expect(
      encryptBackupPayload(makeBackupPayload(profile, records), "1234567"),
    ).rejects.toThrow("8 أحرف");
  });
});
