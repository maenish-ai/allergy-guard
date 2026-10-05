import { base64ToBytes, decryptDeviceBackup, loadEmailBackupPreferences, markBackupSent, prepareEncryptedDeviceBackup, stringToBase64, type DeviceBackupPayload, type EmailProvider } from "./email-backup";
import { getValidEmailAccessToken, providerSupportsDirectMailbox, type DirectEmailProvider } from "./email-account";

const SUBJECT_PREFIX = "Allergy Guard encrypted backup";

function toBase64Url(value: string) {
  return stringToBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function chunkBase64(value: string) {
  return value.replace(/.{1,76}/g, (chunk) => `${chunk}\r\n`).trimEnd();
}

function mimeMessage(to: string, filename: string, encrypted: string) {
  const boundary = `allergy-guard-${Date.now().toString(36)}`;
  const textBody =
    "نسخة احتياطية مشفرة من تطبيق حارس الحساسية. يمكن استرجاعها من داخل التطبيق بعد ربط حساب البريد. احتفظ بكلمة مرور النسخة في مكان آمن.";
  return [
    `To: ${to}`,
    `Subject: ${SUBJECT_PREFIX} - ${new Date().toISOString().slice(0, 10)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    chunkBase64(stringToBase64(textBody)),
    "",
    `--${boundary}`,
    `Content-Type: application/octet-stream; name=\"${filename}\"`,
    `Content-Disposition: attachment; filename=\"${filename}\"`,
    "Content-Transfer-Encoding: base64",
    "",
    chunkBase64(stringToBase64(encrypted)),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function sendWithGmail(recipient: string, filename: string, encrypted: string) {
  const token = await getValidEmailAccessToken("gmail");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(mimeMessage(recipient, filename, encrypted)) }),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message || `Gmail HTTP ${response.status}`);
}

async function sendWithOutlook(recipient: string, filename: string, encrypted: string) {
  const token = await getValidEmailAccessToken("outlook");
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: `${SUBJECT_PREFIX} - ${new Date().toISOString().slice(0, 10)}`,
        body: {
          contentType: "Text",
          content:
            "نسخة احتياطية مشفرة من تطبيق حارس الحساسية. يمكن استرجاعها من داخل التطبيق بعد ربط حساب البريد.",
        },
        toRecipients: [{ emailAddress: { address: recipient } }],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: filename,
            contentType: "application/octet-stream",
            contentBytes: stringToBase64(encrypted),
          },
        ],
      },
      saveToSentItems: true,
    }),
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || `Microsoft Graph HTTP ${response.status}`);
  }
}

export async function sendEncryptedBackupThroughConnectedAccount(provider: EmailProvider) {
  if (!providerSupportsDirectMailbox(provider)) {
    throw new Error("هذا المزود لا يدعم الإرسال التلقائي المباشر في هذه النسخة. استخدم الإرسال اليدوي.");
  }
  const prefs = await loadEmailBackupPreferences();
  if (!prefs.email) throw new Error("حدد البريد الذي ستصل إليه النسخة أولًا.");
  const { encrypted, filename, lastPreparedAt } = await prepareEncryptedDeviceBackup();
  if (provider === "gmail") {
    await sendWithGmail(prefs.email, filename, encrypted);
  } else {
    await sendWithOutlook(prefs.email, filename, encrypted);
  }
  const lastSentAt = await markBackupSent();
  return { lastPreparedAt, lastSentAt };
}

type GmailPart = {
  filename?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPart[];
};

function findGmailBackupPart(part?: GmailPart): GmailPart | null {
  if (!part) return null;
  if (part.filename?.toLowerCase().endsWith(".agbackup")) return part;
  for (const child of part.parts ?? []) {
    const found = findGmailBackupPart(child);
    if (found) return found;
  }
  return null;
}

async function fetchLatestGmailBackup(): Promise<{ raw: string; receivedAt?: string }> {
  const token = await getValidEmailAccessToken("gmail");
  const headers = { Authorization: `Bearer ${token.accessToken}` };
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", "25");
  listUrl.searchParams.set("q", 'filename:agbackup "Allergy Guard encrypted backup"');
  const listResponse = await fetch(listUrl.toString(), { headers });
  const listJson = (await listResponse.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };
  if (!listResponse.ok) throw new Error(listJson.error?.message || `Gmail HTTP ${listResponse.status}`);

  let foundAttachment = false;
  for (const message of listJson.messages ?? []) {
    if (!message.id) continue;
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=full`,
      { headers },
    );
    const json = (await response.json().catch(() => ({}))) as {
      internalDate?: string;
      payload?: GmailPart;
      error?: { message?: string };
    };
    if (!response.ok) continue;
    const part = findGmailBackupPart(json.payload);
    if (!part?.body) continue;
    let data = part.body.data;
    if (!data && part.body.attachmentId) {
      const attachmentResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
        { headers },
      );
      const attachmentJson = (await attachmentResponse.json().catch(() => ({}))) as { data?: string };
      if (attachmentResponse.ok) data = attachmentJson.data;
    }
    if (!data) continue;
    foundAttachment = true;
    const raw = bytesToUtf8(base64ToBytes(data));
    try {
      await decryptDeviceBackup(raw);
      return {
        raw,
        receivedAt: json.internalDate ? new Date(Number(json.internalDate)).toISOString() : undefined,
      };
    } catch {
      // Continue to older matching backups if this attachment is corrupt or uses another password.
    }
  }
  if (foundAttachment) {
    throw new Error("وجدت نسخة Gmail، لكن تعذر فكها. تحقق من كلمة مرور النسخة الاحتياطية.");
  }
  throw new Error("لم أجد نسخة احتياطية قابلة للاسترجاع في Gmail.");
}

async function fetchLatestOutlookBackup(): Promise<{ raw: string; receivedAt?: string }> {
  const token = await getValidEmailAccessToken("outlook");
  const headers = { Authorization: `Bearer ${token.accessToken}` };

  const loadFolder = async (folder: "inbox" | "sentitems") => {
    const url = new URL(`https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages`);
    url.searchParams.set("$top", "50");
    url.searchParams.set("$orderby", "receivedDateTime desc");
    url.searchParams.set("$select", "id,subject,hasAttachments,receivedDateTime,sentDateTime");
    const response = await fetch(url.toString(), { headers });
    const json = (await response.json().catch(() => ({}))) as {
      value?: {
        id?: string;
        subject?: string;
        hasAttachments?: boolean;
        receivedDateTime?: string;
        sentDateTime?: string;
      }[];
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(json.error?.message || `Microsoft Graph HTTP ${response.status}`);
    return json.value ?? [];
  };

  const [inbox, sent] = await Promise.all([loadFolder("inbox"), loadFolder("sentitems")]);
  const candidates = [...inbox, ...sent]
    .filter((message) => message.id && message.hasAttachments && message.subject?.includes(SUBJECT_PREFIX))
    .sort((a, b) => {
      const aDate = new Date(a.receivedDateTime || a.sentDateTime || 0).getTime();
      const bDate = new Date(b.receivedDateTime || b.sentDateTime || 0).getTime();
      return bDate - aDate;
    });

  let foundAttachment = false;
  for (const message of candidates) {
    const attachmentsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(message.id!)}/attachments`,
      { headers },
    );
    const attachmentsJson = (await attachmentsResponse.json().catch(() => ({}))) as {
      value?: { name?: string; contentBytes?: string; "@odata.type"?: string }[];
    };
    if (!attachmentsResponse.ok) continue;
    for (const attachment of attachmentsJson.value ?? []) {
      if (!attachment.name?.toLowerCase().endsWith(".agbackup") || !attachment.contentBytes) continue;
      foundAttachment = true;
      const raw = bytesToUtf8(base64ToBytes(attachment.contentBytes));
      try {
        await decryptDeviceBackup(raw);
        return { raw, receivedAt: message.receivedDateTime || message.sentDateTime };
      } catch {
        // Try the next candidate.
      }
    }
  }
  if (foundAttachment) {
    throw new Error("وجدت نسخة Outlook، لكن تعذر فكها. تحقق من كلمة مرور النسخة الاحتياطية.");
  }
  throw new Error("لم أجد نسخة احتياطية قابلة للاسترجاع في Outlook / Hotmail.");
}

export async function restoreLatestBackupFromConnectedAccount(provider: EmailProvider): Promise<{
  payload: DeviceBackupPayload;
  receivedAt?: string;
  provider: DirectEmailProvider;
}> {
  if (!providerSupportsDirectMailbox(provider)) {
    throw new Error("الاسترجاع المباشر متاح حاليًا لحسابات Gmail وOutlook/Hotmail المرتبطة رسميًا.");
  }
  const direct = provider as DirectEmailProvider;
  const found = direct === "gmail" ? await fetchLatestGmailBackup() : await fetchLatestOutlookBackup();
  const payload = await decryptDeviceBackup(found.raw);
  return { payload, receivedAt: found.receivedAt, provider: direct };
}
