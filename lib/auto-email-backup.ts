/**
 * Compatibility shim for the retired silent background-mail implementation.
 * The current product intentionally uses a local 24-hour reminder and opens
 * the phone's mail composer only after the user chooses to create a backup.
 */
export async function runAutoEmailBackupIfDue(_force = false) {
  return { sent: false, reason: "manual-mail-composer" as const };
}

export async function syncAutoEmailBackupTask(_enabled: boolean) {
  return;
}

export async function getAutoEmailBackupTaskStatus() {
  return { status: "disabled" as const, registered: false };
}
