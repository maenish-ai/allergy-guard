import * as Crypto from "expo-crypto";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import nacl from "tweetnacl";
import { validateBackup, type BackupPayload } from "./backup-format";

const ENVELOPE_APP = "allergy-guard-encrypted-backup" as const;
const ENVELOPE_VERSION = 1 as const;
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 24;
const KEY_BYTES = 32;

type EncryptedBackupEnvelope = {
  app: typeof ENVELOPE_APP;
  schemaVersion: typeof ENVELOPE_VERSION;
  algorithm: "XSalsa20-Poly1305";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

const toBase64 = (bytes: Uint8Array): string => {
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return BufferImpl.from(bytes).toString("base64");
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return globalThis.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) return new Uint8Array(BufferImpl.from(value, "base64"));
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const assertPassword = (password: string) => {
  if (password.trim().length < 8) {
    throw new Error("يجب أن تتكون كلمة مرور النسخة من 8 أحرف على الأقل.");
  }
};

const deriveKey = async (password: string, salt: Uint8Array) =>
  pbkdf2Async(sha256, password, salt, {
    c: ITERATIONS,
    dkLen: KEY_BYTES,
    asyncTick: 8,
  });

export function isEncryptedBackup(
  value: unknown,
): value is EncryptedBackupEnvelope {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<EncryptedBackupEnvelope>;
  return (
    input.app === ENVELOPE_APP &&
    input.schemaVersion === ENVELOPE_VERSION &&
    input.algorithm === "XSalsa20-Poly1305" &&
    input.kdf === "PBKDF2-SHA256" &&
    typeof input.salt === "string" &&
    typeof input.nonce === "string" &&
    typeof input.ciphertext === "string"
  );
}

export async function encryptBackupPayload(
  payload: BackupPayload,
  password: string,
): Promise<string> {
  assertPassword(password);
  const [salt, nonce] = await Promise.all([
    Crypto.getRandomBytesAsync(SALT_BYTES),
    Crypto.getRandomBytesAsync(NONCE_BYTES),
  ]);
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = nacl.secretbox(plaintext, nonce, key);
  const envelope: EncryptedBackupEnvelope = {
    app: ENVELOPE_APP,
    schemaVersion: ENVELOPE_VERSION,
    algorithm: "XSalsa20-Poly1305",
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ciphertext: toBase64(ciphertext),
  };
  return JSON.stringify(envelope, null, 2);
}

export async function decryptBackupPayload(
  raw: string,
  password: string,
): Promise<BackupPayload> {
  assertPassword(password);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ملف النسخة المشفرة غير صالح.");
  }
  if (!isEncryptedBackup(parsed)) {
    throw new Error("هذا الملف ليس نسخة مشفرة من حارس الحساسية.");
  }
  if (parsed.iterations !== ITERATIONS) {
    throw new Error("إصدار تشفير النسخة غير مدعوم.");
  }
  try {
    const salt = fromBase64(parsed.salt);
    const nonce = fromBase64(parsed.nonce);
    const ciphertext = fromBase64(parsed.ciphertext);
    if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES) {
      throw new Error("invalid envelope dimensions");
    }
    const key = await deriveKey(password, salt);
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
    if (!plaintext) throw new Error("authentication failed");
    const decoded = new TextDecoder().decode(plaintext);
    return validateBackup(JSON.parse(decoded));
  } catch {
    throw new Error("تعذر فك النسخة. تحقق من كلمة المرور وسلامة الملف.");
  }
}

export const encryptionInfo = {
  algorithm: "XSalsa20-Poly1305",
  kdf: "PBKDF2-SHA256",
  iterations: ITERATIONS,
};
