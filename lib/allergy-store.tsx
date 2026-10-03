import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type RecordKind =
  | "medicine-allergy"
  | "food-allergy"
  | "medicine-tolerated";
export type Severity = "خفيفة" | "متوسطة" | "شديدة";

export type AllergyRecord = {
  id: string;
  kind: RecordKind;
  name: string;
  activeIngredient?: string;
  purpose?: string;
  symptoms?: string;
  severity?: Severity;
  date: string;
};

export type Profile = {
  fullName: string;
  birthDate: string;
  phone: string;
  emergencyContact: string;
  doctor: string;
};

type StoreValue = {
  records: AllergyRecord[];
  profile: Profile;
  hydrated: boolean;
  addRecord: (record: Omit<AllergyRecord, "id" | "date">) => void;
  deleteRecord: (id: string) => void;
  saveProfile: (profile: Profile) => void;
  replaceData: (records: AllergyRecord[], profile: Profile) => void;
};

const STORAGE_KEY = "allergy-guard-data-v1";
const emptyProfile: Profile = {
  fullName: "",
  birthDate: "",
  phone: "",
  emergencyContact: "",
  doctor: "",
};
const StoreContext = createContext<StoreValue | null>(null);

export function AllergyProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<AllergyRecord[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          records?: AllergyRecord[];
          profile?: Profile;
        };
        setRecords(parsed.records ?? []);
        setProfile({ ...emptyProfile, ...(parsed.profile ?? {}) });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ records, profile }),
    ).catch(() => undefined);
  }, [hydrated, records, profile]);

  const value = useMemo<StoreValue>(
    () => ({
      records,
      profile,
      hydrated,
      addRecord: (input) =>
        setRecords((current) => [
          {
            ...input,
            id: `${Date.now()}-${Math.random()}`,
            date: new Date().toISOString(),
          },
          ...current,
        ]),
      deleteRecord: (id) =>
        setRecords((current) => current.filter((record) => record.id !== id)),
      saveProfile: (nextProfile) => setProfile(nextProfile),
      replaceData: (nextRecords, nextProfile) => {
        setRecords(nextRecords);
        setProfile({ ...emptyProfile, ...nextProfile });
      },
    }),
    [records, profile, hydrated],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useAllergy() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAllergy must be used inside AllergyProvider");
  return value;
}
