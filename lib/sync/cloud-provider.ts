import type { Patient } from "@/lib/allergy-store";

/**
 * Contract for a future cloud synchronization provider.
 * The app currently uses local AsyncStorage only. A Firebase/Supabase adapter can
 * implement this interface later without changing the screen components.
 */
export interface CloudSyncProvider {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  isSignedIn(): Promise<boolean>;
  pullPatients(): Promise<Patient[]>;
  pushPatients(patients: Patient[]): Promise<void>;
}

export type CloudSyncStatus =
  | "local-only"
  | "syncing"
  | "synced"
  | "offline"
  | "error";
