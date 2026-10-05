import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import nacl from "tweetnacl";

export type EmailProvider = "gmail" | "outlook" | "yahoo" | "other";

export type EmailBackupPreferences = {
  provider: EmailProvider;
  email: string;
  dailyReminder: boolean;
  autoBackup: boolean;
  lastPreparedAt?: string;
  lastSentAt?: string;
};

export type DeviceBackupPayload = {
  app: "allergy-guard";
  schemaVersion: 3;
  exportedAt: string;
  data: unknown;
};

type EncryptedDeviceBackup = {
  app: "allergy-guard-device-backup";
  schemaVersion: 1;
  algorithm: "XSalsa20-Poly1305";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

const DATA_KEY = "allergy-guard-data-v2";
const PREFS_KEY = "allergy-guard-email-backup-settings-v1";
const PASSWORD_KEY = "allergy-guard-email-backup-password-v1";
const REMINDER_ID_KEY = "allergy-guard-email-backup-reminder-id-v1";
const BACKUP_DIR = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}email-backups/`;
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 24;
const KEY_BYTES = 32;

const DEFAULT_PREFS: EmailBackupPreferences = {
  provider: "gmail",
  email: "",
  dailyReminder: false,
  autoBackup: false,
};

export function bytesToBase64(bytes: Uint8Array): string {
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return BufferImpl.from(bytes).toString("base64");
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return globalThis.btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return new Uint8Array(BufferImpl.from(padded, "base64"));
  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function stringToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function assertPassword(password: string) {
  if (password.trim().length < 8) {
    throw new Error("كلمة مرور النسخة الاحتياطية يجب أن تكون 8 أحرف على الأقل.");
  }
}

async function deriveKey(password: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, password, salt, {
    c: ITERATIONS,
    dkLen: KEY_BYTES,
    asyncTick: 8,
  });
}

async function encryptDeviceBackup(payload: DeviceBackupPayload, password: string) {
  assertPassword(password);
  const salt = nacl.randomBytes(SALT_BYTES);
  const nonce = nacl.randomBytes(NONCE_BYTES);
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = nacl.secretbox(plaintext, nonce, key);
  const envelope: EncryptedDeviceBackup = {
    app: "allergy-guard-device-backup",
    schemaVersion: 1,
    algorithm: "XSalsa20-Poly1305",
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext),
  };
  return JSON.stringify(envelope, null, 2);
}

function isEncryptedDeviceBackup(value: unknown): value is EncryptedDeviceBackup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EncryptedDeviceBackup>;
  return (
    candidate.app === "allergy-guard-device-backup" &&
    candidate.schemaVersion === 1 &&
    candidate.algorithm === "XSalsa20-Poly1305" &&
    candidate.kdf === "PBKDF2-SHA256" &&
    candidate.iterations === ITERATIONS &&
    typeof candidate.salt === "string" &&
    typeof candidate.nonce === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

export async function decryptDeviceBackup(
  raw: string,
  passwordOverride?: string,
): Promise<DeviceBackupPayload> {
  const password = passwordOverride ?? (await SecureStore.getItemAsync(PASSWORD_KEY));
  if (!password) throw new Error("لم يتم إعداد كلمة مرور النسخة الاحتياطية بعد.");
  assertPassword(password);

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }
  if (!isEncryptedDeviceBackup(envelope)) {
    throw new Error("هذا الملف ليس نسخة مشفرة صالحة من حارس الحساسية.");
  }

  try {
    const salt = base64ToBytes(envelope.salt);
    const nonce = base64ToBytes(envelope.nonce);
    const ciphertext = base64ToBytes(envelope.ciphertext);
    if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES) {
      throw new Error("invalid backup envelope");
    }
    const key = await deriveKey(password, salt);
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
    if (!plaintext) throw new Error("authentication failed");
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<DeviceBackupPayload>;
    if (payload.app !== "allergy-guard" || payload.schemaVersion !== 3 || !("data" in payload)) {
      throw new Error("invalid payload");
    }
    return payload as DeviceBackupPayload;
  } catch {
    throw new Error("تعذر فك النسخة. تحقق من كلمة مرور النسخة وسلامة الملف.");
  }
}

function backupFilename() {
  return `AllergyGuard-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.agbackup`;
}

async function ensureBackupDirectory() {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

async function pruneOldBackups() {
  try {
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    const backups = files.filter((name) => name.endsWith(".agbackup")).sort().reverse();
    await Promise.all(
      backups.slice(7).map((name) =>
        FileSystem.deleteAsync(`${BACKUP_DIR}${name}`, { idempotent: true }).catch(() => undefined),
      ),
    );
  } catch {
    // Cleanup is best-effort and must never block a fresh backup.
  }
}

export async function loadEmailBackupPreferences(): Promise<EmailBackupPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<EmailBackupPreferences>;
    const provider: EmailProvider =
      parsed.provider === "gmail" ||
      parsed.provider === "outlook" ||
      parsed.provider === "yahoo" ||
      parsed.provider === "other"
        ? parsed.provider
        : "gmail";
    return {
      provider,
      email: typeof parsed.email === "string" ? parsed.email : "",
      dailyReminder: parsed.dailyReminder === true,
      autoBackup: parsed.autoBackup === true,
      lastPreparedAt: typeof parsed.lastPreparedAt === "string" ? parsed.lastPreparedAt : undefined,
      lastSentAt: typeof parsed.lastSentAt === "string" ? parsed.lastSentAt : undefined,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function hasBackupPassword() {
  return Boolean(await SecureStore.getItemAsync(PASSWORD_KEY));
}

export async function getBackupPassword() {
  return SecureStore.getItemAsync(PASSWORD_KEY);
}

export async function saveEmailBackupPreferences(
  preferences: EmailBackupPreferences,
  password?: string,
) {
  const email = preferences.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("أدخل عنوان بريد إلكتروني صحيح.");
  if (password?.trim()) {
    assertPassword(password);
    await SecureStore.setItemAsync(PASSWORD_KEY, password);
  } else if (!(await hasBackupPassword())) {
    throw new Error("ضع كلمة مرور للنسخة الاحتياطية من 8 أحرف على الأقل.");
  }
  const next = { ...preferences, email };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}

export async function markBackupSent() {
  const prefs = await loadEmailBackupPreferences();
  const lastSentAt = new Date().toISOString();
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, lastSentAt }));
  return lastSentAt;
}

export async function prepareEncryptedDeviceBackup() {
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  if (!password) throw new Error("لم يتم إعداد كلمة مرور النسخة الاحتياطية بعد.");

  const raw = await AsyncStorage.getItem(DATA_KEY);
  const data = raw
    ? JSON.parse(raw)
    : { schemaVersion: 2, patients: [], activePatientId: null };
  const payload: DeviceBackupPayload = {
    app: "allergy-guard",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    data,
  };
  const encrypted = await encryptDeviceBackup(payload, password);
  await ensureBackupDirectory();
  const uri = `${BACKUP_DIR}${backupFilename()}`;
  await FileSystem.writeAsStringAsync(uri, encrypted, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await pruneOldBackups();

  const prefs = await loadEmailBackupPreferences();
  const lastPreparedAt = new Date().toISOString();
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, lastPreparedAt }));
  return { uri, encrypted, lastPreparedAt, filename: uri.split("/").pop() ?? backupFilename() };
}

export async function emailEncryptedBackupNow() {
  const prefs = await loadEmailBackupPreferences();
  if (!isValidEmail(prefs.email)) throw new Error("احفظ البريد الإلكتروني أولًا من الإعدادات.");
  if (!(await MailComposer.isAvailableAsync())) {
    throw new Error("لا يوجد تطبيق بريد جاهز للإرسال على هذا الجهاز.");
  }

  const { uri, lastPreparedAt } = await prepareEncryptedDeviceBackup();
  await MailComposer.composeAsync({
    recipients: [prefs.email],
    subject: `Allergy Guard encrypted backup - ${new Date().toISOString().slice(0, 10)}`,
    body:
      "نسخة احتياطية مشفرة من تطبيق حارس الحساسية. احتفظ بكلمة مرور النسخة في مكان آمن؛ لا يمكن فتح الملف بدونها.",
    attachments: [uri],
  });
  return { uri, lastPreparedAt };
}

async function cancelExistingReminder() {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }
}

export async function syncDailyBackupReminder(enabled: boolean) {
  await cancelExistingReminder();
  if (!enabled) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("backup-reminders", {
      name: "تذكير النسخ الاحتياطي",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("فعّل إذن الإشعارات حتى يعمل تذكير النسخة كل 24 ساعة.");
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "حارس الحساسية",
      body: "حان وقت إرسال النسخة الاحتياطية المشفرة إلى بريدك.",
      data: { screen: "settings", action: "email-backup" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 24 * 60 * 60,
      repeats: true,
      ...(Platform.OS === "android" ? { channelId: "backup-reminders" } : {}),
    },
  });
  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
}

export const providerLabels: Record<EmailProvider, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Hotmail",
  yahoo: "Yahoo",
  other: "بريد آخر",
};
