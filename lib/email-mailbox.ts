import type {
  DeviceBackupPayload,
  EmailProvider,
} from "./email-backup";
import type { DirectEmailProvider } from "./email-account";

/**
 * Compatibility shim for the retired Gmail / Microsoft Graph mailbox flow.
 * The active backup flow uses expo-mail-composer and the user's installed
 * mail application, so no OAuth client, cloud project, or server is required.
 */
const MANUAL_MAIL_MESSAGE =
  "الإرسال والاسترجاع المباشر من صندوق البريد غير مستخدم في هذه النسخة. استخدم تطبيق البريد للإرسال، واختر ملف .agbackup للاسترجاع.";

export async function sendEncryptedBackupThroughConnectedAccount(
  _provider: EmailProvider,
): Promise<never> {
  throw new Error(MANUAL_MAIL_MESSAGE);
}

export async function restoreLatestBackupFromConnectedAccount(
  _provider: EmailProvider,
): Promise<{
  payload: DeviceBackupPayload;
  receivedAt?: string;
  provider: DirectEmailProvider;
}> {
  throw new Error(MANUAL_MAIL_MESSAGE);
}
