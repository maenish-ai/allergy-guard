import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { getEmailConnectionStatus, providerSupportsDirectMailbox } from "./email-account";
import { loadEmailBackupPreferences } from "./email-backup";
import { sendEncryptedBackupThroughConnectedAccount } from "./email-mailbox";

const TASK_NAME = "allergy-guard-auto-email-backup-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function runAutoEmailBackupIfDue(force = false) {
  const prefs = await loadEmailBackupPreferences();
  if (!prefs.autoBackup || !providerSupportsDirectMailbox(prefs.provider)) {
    return { sent: false, reason: "disabled-or-unsupported" as const };
  }
  if (!force && prefs.lastSentAt) {
    const elapsed = Date.now() - new Date(prefs.lastSentAt).getTime();
    if (Number.isFinite(elapsed) && elapsed < DAY_MS) {
      return { sent: false, reason: "not-due" as const };
    }
  }
  const status = await getEmailConnectionStatus(prefs.provider);
  if (!status.connected) {
    return { sent: false, reason: "not-connected" as const };
  }
  await sendEncryptedBackupThroughConnectedAccount(prefs.provider);
  return { sent: true, reason: "sent" as const };
}

if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await runAutoEmailBackupIfDue(false);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.warn("Automatic email backup task failed:", error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function syncAutoEmailBackupTask(enabled: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!enabled) {
    if (registered) await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    return;
  }
  if (!registered) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 24 * 60,
    });
  }
}

export async function getAutoEmailBackupTaskStatus() {
  const [status, registered] = await Promise.all([
    BackgroundTask.getStatusAsync(),
    TaskManager.isTaskRegisteredAsync(TASK_NAME),
  ]);
  return { status, registered };
}
