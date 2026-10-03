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

function normalizeRecords(value: unknown): AllergyRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AllergyRecord => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<AllergyRecord>;
    return typeof record.id === "string" && typeof record.name === "string";
  });
}

export function AllergyProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<AllergyRecord[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw || !isMounted) return;

        try {
          const parsed = JSON.parse(raw) as {
            records?: unknown;
            profile?: Partial<Profile>;
          };

          setRecords(normalizeRecords(parsed.records));
          setProfile({ ...emptyProfile, ...(parsed.profile ?? {}) });
        } catch (error) {
          console.warn("Failed to hydrate allergy store:", error);
          setRecords([]);
          setProfile(emptyProfile);
        }
      })
      .catch((error) => {
        console.warn("Failed to read allergy store:", error);
      })
      .finally(() => {
        if (isMounted) setHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ records, profile })).catch(
      (error) => {
        console.warn("Failed to persist allergy store:", error);
      },
    );
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
        setRecords(normalizeRecords(nextRecords));
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
