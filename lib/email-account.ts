import type { EmailProvider } from "./email-backup";

/**
 * Compatibility shim for the retired direct-mail OAuth implementation.
 * v0.7.3+ intentionally uses the phone's installed mail app instead.
 * Keeping this file prevents old repository leftovers from breaking TypeScript
 * when a full-folder upload overwrites files but does not delete removed files.
 */
export type DirectEmailProvider = "gmail" | "outlook";

export type EmailConnectionStatus = {
  provider: EmailProvider;
  supported: boolean;
  configured: boolean;
  connected: boolean;
  email?: string;
  reason?: string;
  redirectUri?: string;
};

const MANUAL_MAIL_MESSAGE =
  "الربط المباشر بالبريد غير مستخدم في هذه النسخة. استخدم زر تجهيز النسخة وفتح تطبيق البريد من الإعدادات.";

export function getEmailOAuthRedirectUri(_provider?: EmailProvider) {
  return undefined;
}

export function providerSupportsDirectMailbox(_provider: EmailProvider) {
  return false;
}

export async function getEmailConnectionStatus(
  provider: EmailProvider,
): Promise<EmailConnectionStatus> {
  return {
    provider,
    supported: false,
    configured: false,
    connected: false,
    reason: MANUAL_MAIL_MESSAGE,
  };
}

export async function connectEmailProvider(_provider: EmailProvider): Promise<never> {
  throw new Error(MANUAL_MAIL_MESSAGE);
}

export async function disconnectEmailProvider(_provider: EmailProvider) {
  return;
}

export async function getValidEmailAccessToken(
  provider: DirectEmailProvider,
): Promise<{ provider: DirectEmailProvider; accessToken: string; email: string }> {
  throw new Error(`${MANUAL_MAIL_MESSAGE} (${provider})`);
}
