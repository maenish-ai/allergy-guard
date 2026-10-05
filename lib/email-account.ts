import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { sha256 } from "@noble/hashes/sha2.js";
import nacl from "tweetnacl";
import {
  GoogleOneTapSignIn,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "react-native-nitro-google-signin";
import type { EmailProvider } from "./email-backup";

export type DirectEmailProvider = "gmail" | "outlook";

type StoredMicrosoftToken = {
  provider: "outlook";
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  email: string;
};

type StoredGoogleConnection = {
  provider: "gmail";
  email: string;
  connectedAt: string;
};

export type EmailConnectionStatus = {
  provider: EmailProvider;
  supported: boolean;
  configured: boolean;
  connected: boolean;
  email?: string;
  reason?: string;
  redirectUri?: string;
};

const MICROSOFT_TOKEN_KEY = "allergy-guard-email-oauth-v2-outlook";
const GOOGLE_CONNECTION_KEY = "allergy-guard-email-oauth-v2-gmail";
const REFRESH_SKEW_MS = 2 * 60 * 1000;

const googleScopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
  "";

const microsoftConfig = {
  clientId: process.env.EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID ?? "",
  authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.Send",
  ],
} as const;

function configureGoogle() {
  if (!googleWebClientId) return;
  GoogleOneTapSignIn.configure({
    webClientId: googleWebClientId,
    scopes: googleScopes,
  });
}

function toBase64Url(bytes: Uint8Array) {
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  let base64: string;
  if (BufferImpl) {
    base64 = BufferImpl.from(bytes).toString("base64");
  } else {
    let binary = "";
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    base64 = globalThis.btoa(binary);
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makePkce() {
  const verifier = toBase64Url(nacl.randomBytes(48));
  const challenge = toBase64Url(sha256(new TextEncoder().encode(verifier)));
  const state = toBase64Url(nacl.randomBytes(24));
  return { verifier, challenge, state };
}

function directProvider(provider: EmailProvider): DirectEmailProvider | null {
  return provider === "gmail" || provider === "outlook" ? provider : null;
}

async function formPost(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number | string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok) {
    throw new Error(json.error_description || json.error || `OAuth HTTP ${response.status}`);
  }
  return json;
}

async function saveMicrosoftToken(token: StoredMicrosoftToken) {
  await SecureStore.setItemAsync(MICROSOFT_TOKEN_KEY, JSON.stringify(token));
}

async function loadMicrosoftToken(): Promise<StoredMicrosoftToken | null> {
  const raw = await SecureStore.getItemAsync(MICROSOFT_TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredMicrosoftToken>;
    if (
      parsed.provider !== "outlook" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }
    return parsed as StoredMicrosoftToken;
  } catch {
    return null;
  }
}

async function loadGoogleConnection(): Promise<StoredGoogleConnection | null> {
  const raw = await SecureStore.getItemAsync(GOOGLE_CONNECTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredGoogleConnection>;
    if (parsed.provider !== "gmail" || typeof parsed.email !== "string") return null;
    return {
      provider: "gmail",
      email: parsed.email,
      connectedAt: typeof parsed.connectedAt === "string" ? parsed.connectedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchMicrosoftEmail(accessToken: string) {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const json = (await response.json().catch(() => ({}))) as {
    mail?: string;
    userPrincipalName?: string;
    error?: { message?: string };
  };
  const email = json.mail || json.userPrincipalName;
  if (!response.ok || !email) {
    throw new Error(json.error?.message || "تعذر قراءة بريد حساب Microsoft.");
  }
  return email.toLowerCase();
}

export function getEmailOAuthRedirectUri(provider?: EmailProvider) {
  if (provider === "gmail") return undefined;
  return Linking.createURL("email-auth", { scheme: "allergyguard" });
}

export function providerSupportsDirectMailbox(provider: EmailProvider) {
  return provider === "gmail" || provider === "outlook";
}

export async function getEmailConnectionStatus(provider: EmailProvider): Promise<EmailConnectionStatus> {
  const direct = directProvider(provider);
  if (!direct) {
    return {
      provider,
      supported: false,
      configured: false,
      connected: false,
      reason:
        provider === "yahoo"
          ? "Yahoo لا يوفّر واجهة Mail REST عامة مناسبة لتطبيق Android بدون خادم وسيط يحفظ سر OAuth. سيبقى Yahoo مدعومًا للإرسال اليدوي المشفّر."
          : "البريد الآخر يستخدم تطبيق البريد المثبت على الجهاز للإرسال اليدوي.",
    };
  }

  if (direct === "gmail") {
    const saved = await loadGoogleConnection();
    return {
      provider,
      supported: true,
      configured: Boolean(googleWebClientId),
      connected: Boolean(saved),
      email: saved?.email,
      reason: googleWebClientId
        ? undefined
        : "أضف EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID إلى GitHub Actions، وأنشئ Google Android OAuth client للحزمة com.mkassis37.allergyguard مع SHA-1 لمفتاح التوقيع.",
    };
  }

  const token = await loadMicrosoftToken();
  return {
    provider,
    supported: true,
    configured: Boolean(microsoftConfig.clientId),
    connected: Boolean(token?.refreshToken || (token && token.expiresAt > Date.now())),
    email: token?.email || undefined,
    redirectUri: getEmailOAuthRedirectUri("outlook"),
    reason: microsoftConfig.clientId
      ? undefined
      : "أضف EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID إلى GitHub Actions بعد تسجيل تطبيق Mobile/Desktop في Microsoft Entra.",
  };
}

async function connectGoogle() {
  if (!googleWebClientId) {
    const status = await getEmailConnectionStatus("gmail");
    throw new Error(status.reason ?? "لم يتم إعداد Google OAuth.");
  }
  configureGoogle();
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (!isSuccessResponse(response)) {
    throw new Error("تم إلغاء أو تعذر تسجيل الدخول بحساب Google.");
  }

  const email = response.data.user.email?.toLowerCase();
  if (!email) throw new Error("تعذر قراءة عنوان Gmail من حساب Google.");
  const { accessToken } = await GoogleOneTapSignIn.getTokens();
  if (!accessToken) throw new Error("لم يتم منح صلاحية الوصول إلى Gmail.");
  await SecureStore.setItemAsync(
    GOOGLE_CONNECTION_KEY,
    JSON.stringify({ provider: "gmail", email, connectedAt: new Date().toISOString() } satisfies StoredGoogleConnection),
  );
  return { provider: "gmail" as const, email };
}

async function connectMicrosoft() {
  if (!microsoftConfig.clientId) {
    const status = await getEmailConnectionStatus("outlook");
    throw new Error(status.reason ?? "لم يتم إعداد Microsoft OAuth.");
  }
  const redirectUri = getEmailOAuthRedirectUri("outlook");
  if (!redirectUri) throw new Error("تعذر إنشاء رابط العودة إلى التطبيق.");
  const { verifier, challenge, state } = makePkce();
  const authUrl = new URL(microsoftConfig.authorizeUrl);
  authUrl.searchParams.set("client_id", microsoftConfig.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", microsoftConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("prompt", "select_account");

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);
  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error("تم إلغاء ربط حساب Microsoft.");
  }
  const callback = new URL(result.url);
  if (callback.searchParams.get("state") !== state) {
    throw new Error("فشل التحقق الأمني من عملية ربط البريد.");
  }
  const oauthError = callback.searchParams.get("error_description") || callback.searchParams.get("error");
  if (oauthError) throw new Error(oauthError);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("لم يتم استلام رمز التفويض من Microsoft.");

  const json = await formPost(microsoftConfig.tokenUrl, {
    client_id: microsoftConfig.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: microsoftConfig.scopes.join(" "),
  });
  if (!json.access_token) throw new Error("لم يتم استلام رمز دخول من Microsoft.");
  const expiresIn = Number(json.expires_in ?? 3600);
  const email = await fetchMicrosoftEmail(json.access_token);
  const token: StoredMicrosoftToken = {
    provider: "outlook",
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Math.max(Number.isFinite(expiresIn) ? expiresIn : 3600, 60) * 1000,
    scope: json.scope,
    email,
  };
  await saveMicrosoftToken(token);
  return { provider: "outlook" as const, email };
}

export async function connectEmailProvider(provider: EmailProvider) {
  if (provider === "gmail") return connectGoogle();
  if (provider === "outlook") return connectMicrosoft();
  const status = await getEmailConnectionStatus(provider);
  throw new Error(status.reason ?? "هذا المزود غير مدعوم للربط المباشر.");
}

export async function disconnectEmailProvider(provider: EmailProvider) {
  if (provider === "gmail") {
    configureGoogle();
    await GoogleOneTapSignIn.signOut().catch(() => undefined);
    await SecureStore.deleteItemAsync(GOOGLE_CONNECTION_KEY);
    return;
  }
  if (provider === "outlook") {
    await SecureStore.deleteItemAsync(MICROSOFT_TOKEN_KEY);
  }
}

async function getGoogleAccessToken() {
  if (!googleWebClientId) throw new Error("لم يتم إعداد Google OAuth في نسخة التطبيق.");
  configureGoogle();
  const current = GoogleOneTapSignIn.getCurrentUser();
  if (!current) {
    const response = await GoogleOneTapSignIn.signIn();
    if (!isSuccessResponse(response)) {
      throw new Error("انتهت جلسة Gmail. أعد ربط الحساب من الإعدادات.");
    }
  }
  const { accessToken } = await GoogleOneTapSignIn.getTokens();
  if (!accessToken) throw new Error("تعذر الحصول على صلاحية Gmail.");
  const saved = await loadGoogleConnection();
  return {
    provider: "gmail" as const,
    accessToken,
    email: saved?.email || "",
  };
}

async function getMicrosoftAccessToken() {
  if (!microsoftConfig.clientId) throw new Error("لم يتم إعداد Microsoft OAuth في نسخة التطبيق.");
  const current = await loadMicrosoftToken();
  if (!current) throw new Error("اربط حساب Outlook / Hotmail أولًا من الإعدادات.");
  if (current.expiresAt - REFRESH_SKEW_MS > Date.now()) return current;
  if (!current.refreshToken) throw new Error("انتهت جلسة Microsoft. أعد ربط الحساب من الإعدادات.");

  const json = await formPost(microsoftConfig.tokenUrl, {
    client_id: microsoftConfig.clientId,
    refresh_token: current.refreshToken,
    grant_type: "refresh_token",
    scope: microsoftConfig.scopes.join(" "),
  });
  if (!json.access_token) throw new Error("تعذر تحديث جلسة Microsoft.");
  const expiresIn = Number(json.expires_in ?? 3600);
  const refreshed: StoredMicrosoftToken = {
    ...current,
    accessToken: json.access_token,
    refreshToken: json.refresh_token || current.refreshToken,
    expiresAt: Date.now() + Math.max(Number.isFinite(expiresIn) ? expiresIn : 3600, 60) * 1000,
    scope: json.scope || current.scope,
  };
  await saveMicrosoftToken(refreshed);
  return refreshed;
}

export async function getValidEmailAccessToken(provider: DirectEmailProvider) {
  return provider === "gmail" ? getGoogleAccessToken() : getMicrosoftAccessToken();
}
