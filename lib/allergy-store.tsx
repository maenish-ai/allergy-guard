import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type RecordKind =
  | "medicine-allergy"
  | "food-allergy"
  | "other-allergy"
  | "medicine-tolerated"
  | "medicine"
  | "chronic-condition"
  | "surgery"
  | "medical-note";

export type Severity = "خفيفة" | "متوسطة" | "شديدة";

export type AllergyRecord = {
  id: string;
  kind: RecordKind;
  name: string;
  activeIngredient?: string;
  purpose?: string;
  dosage?: string;
  frequency?: string;
  symptoms?: string;
  severity?: Severity;
  notes?: string;
  eventDate?: string;
  date: string;
  updatedAt?: string;
};

export type Profile = {
  fullName: string;
  birthDate: string;
  phone: string;
  emergencyContact: string;
  doctor: string;
  gender?: "ذكر" | "أنثى" | "";
  bloodType?: string;
  notes?: string;
};

export type Patient = Profile & {
  id: string;
  records: AllergyRecord[];
  createdAt: string;
  updatedAt: string;
};

export type PatientInput = Profile;

type StoreValue = {
  patients: Patient[];
  activePatientId: string | null;
  activePatient: Patient | null;
  records: AllergyRecord[];
  profile: Profile;
  hydrated: boolean;
  addPatient: (input: PatientInput) => string;
  updatePatient: (id: string, input: PatientInput) => void;
  deletePatient: (id: string) => void;
  selectPatient: (id: string) => void;
  addRecord: (record: Omit<AllergyRecord, "id" | "date" | "updatedAt">) => void;
  updateRecord: (
    id: string,
    record: Omit<AllergyRecord, "id" | "date" | "updatedAt">,
  ) => void;
  deleteRecord: (id: string) => void;
  saveProfile: (profile: Profile) => void;
  replaceData: (records: AllergyRecord[], profile: Profile) => void;
};

const STORAGE_KEY_V2 = "allergy-guard-data-v2";
const STORAGE_KEY_V1 = "allergy-guard-data-v1";

export const emptyProfile: Profile = {
  fullName: "",
  birthDate: "",
  phone: "",
  emergencyContact: "",
  doctor: "",
  gender: "",
  bloodType: "",
  notes: "",
};

const StoreContext = createContext<StoreValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeKind(value: unknown): RecordKind {
  const allowed: RecordKind[] = [
    "medicine-allergy",
    "food-allergy",
    "other-allergy",
    "medicine-tolerated",
    "medicine",
    "chronic-condition",
    "surgery",
    "medical-note",
  ];
  return allowed.includes(value as RecordKind) ? (value as RecordKind) : "medical-note";
}

function normalizeRecords(value: unknown): AllergyRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Partial<AllergyRecord>;
      const now = new Date().toISOString();
      return {
        id: typeof record.id === "string" ? record.id : makeId("record"),
        kind: normalizeKind(record.kind),
        name: typeof record.name === "string" ? record.name : "سجل بدون اسم",
        activeIngredient:
          typeof record.activeIngredient === "string" ? record.activeIngredient : "",
        purpose: typeof record.purpose === "string" ? record.purpose : "",
        dosage: typeof record.dosage === "string" ? record.dosage : "",
        frequency: typeof record.frequency === "string" ? record.frequency : "",
        symptoms: typeof record.symptoms === "string" ? record.symptoms : "",
        severity:
          record.severity === "خفيفة" ||
          record.severity === "متوسطة" ||
          record.severity === "شديدة"
            ? record.severity
            : undefined,
        notes: typeof record.notes === "string" ? record.notes : "",
        eventDate: typeof record.eventDate === "string" ? record.eventDate : "",
        date: typeof record.date === "string" ? record.date : now,
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
      };
    });
}

function normalizeProfile(value: unknown): Profile {
  if (!value || typeof value !== "object") return { ...emptyProfile };
  const p = value as Partial<Profile>;
  return {
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    birthDate: typeof p.birthDate === "string" ? p.birthDate : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    emergencyContact:
      typeof p.emergencyContact === "string" ? p.emergencyContact : "",
    doctor: typeof p.doctor === "string" ? p.doctor : "",
    gender: p.gender === "ذكر" || p.gender === "أنثى" ? p.gender : "",
    bloodType: typeof p.bloodType === "string" ? p.bloodType : "",
    notes: typeof p.notes === "string" ? p.notes : "",
  };
}

function normalizePatients(value: unknown): Patient[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const source = item as Partial<Patient>;
      const profile = normalizeProfile(source);
      const now = new Date().toISOString();
      return {
        ...profile,
        id: typeof source.id === "string" ? source.id : makeId("patient"),
        records: normalizeRecords(source.records),
        createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
      };
    });
}

function profileFromPatient(patient: Patient | null): Profile {
  if (!patient) return { ...emptyProfile };
  return {
    fullName: patient.fullName,
    birthDate: patient.birthDate,
    phone: patient.phone,
    emergencyContact: patient.emergencyContact,
    doctor: patient.doctor,
    gender: patient.gender ?? "",
    bloodType: patient.bloodType ?? "",
    notes: patient.notes ?? "",
  };
}

export function AllergyProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rawV2 = await AsyncStorage.getItem(STORAGE_KEY_V2);
        if (rawV2) {
          const parsed = JSON.parse(rawV2) as {
            patients?: unknown;
            activePatientId?: unknown;
          };
          const restored = normalizePatients(parsed.patients);
          if (!mounted) return;
          setPatients(restored);
          const requested =
            typeof parsed.activePatientId === "string"
              ? parsed.activePatientId
              : null;
          setActivePatientId(
            requested && restored.some((p) => p.id === requested)
              ? requested
              : restored[0]?.id ?? null,
          );
          return;
        }

        // Migration from the original single-patient storage.
        const rawV1 = await AsyncStorage.getItem(STORAGE_KEY_V1);
        if (rawV1) {
          const parsed = JSON.parse(rawV1) as {
            records?: unknown;
            profile?: unknown;
          };
          const profile = normalizeProfile(parsed.profile);
          const now = new Date().toISOString();
          const patient: Patient = {
            ...profile,
            id: makeId("patient"),
            records: normalizeRecords(parsed.records),
            createdAt: now,
            updatedAt: now,
          };
          if (!mounted) return;
          setPatients([patient]);
          setActivePatientId(patient.id);
        }
      } catch (error) {
        console.warn("Failed to hydrate allergy store:", error);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({ schemaVersion: 2, patients, activePatientId }),
    ).catch((error) => console.warn("Failed to persist allergy store:", error));
  }, [hydrated, patients, activePatientId]);

  const activePatient = useMemo(
    () => patients.find((patient) => patient.id === activePatientId) ?? null,
    [patients, activePatientId],
  );

  const value = useMemo<StoreValue>(() => {
    const updateActivePatient = (updater: (patient: Patient) => Patient) => {
      if (!activePatientId) return;
      setPatients((current) =>
        current.map((patient) =>
          patient.id === activePatientId ? updater(patient) : patient,
        ),
      );
    };

    return {
      patients,
      activePatientId,
      activePatient,
      records: activePatient?.records ?? [],
      profile: profileFromPatient(activePatient),
      hydrated,
      addPatient: (input) => {
        const now = new Date().toISOString();
        const id = makeId("patient");
        const patient: Patient = {
          ...normalizeProfile(input),
          id,
          records: [],
          createdAt: now,
          updatedAt: now,
        };
        setPatients((current) => [...current, patient]);
        setActivePatientId(id);
        return id;
      },
      updatePatient: (id, input) => {
        const normalized = normalizeProfile(input);
        setPatients((current) =>
          current.map((patient) =>
            patient.id === id
              ? { ...patient, ...normalized, updatedAt: new Date().toISOString() }
              : patient,
          ),
        );
      },
      deletePatient: (id) => {
        setPatients((current) => {
          const next = current.filter((patient) => patient.id !== id);
          setActivePatientId((active) =>
            active === id ? next[0]?.id ?? null : active,
          );
          return next;
        });
      },
      selectPatient: (id) => {
        if (patients.some((patient) => patient.id === id)) setActivePatientId(id);
      },
      addRecord: (input) => {
        const now = new Date().toISOString();
        updateActivePatient((patient) => ({
          ...patient,
          updatedAt: now,
          records: [
            {
              ...input,
              id: makeId("record"),
              date: now,
              updatedAt: now,
            },
            ...patient.records,
          ],
        }));
      },
      updateRecord: (id, input) => {
        const now = new Date().toISOString();
        updateActivePatient((patient) => ({
          ...patient,
          updatedAt: now,
          records: patient.records.map((record) =>
            record.id === id
              ? { ...record, ...input, id: record.id, date: record.date, updatedAt: now }
              : record,
          ),
        }));
      },
      deleteRecord: (id) =>
        updateActivePatient((patient) => ({
          ...patient,
          updatedAt: new Date().toISOString(),
          records: patient.records.filter((record) => record.id !== id),
        })),
      saveProfile: (profile) => {
        const normalized = normalizeProfile(profile);
        updateActivePatient((patient) => ({
          ...patient,
          ...normalized,
          updatedAt: new Date().toISOString(),
        }));
      },
      replaceData: (records, profile) => {
        const normalizedProfile = normalizeProfile(profile);
        const normalizedRecords = normalizeRecords(records);
        if (activePatientId) {
          updateActivePatient((patient) => ({
            ...patient,
            ...normalizedProfile,
            records: normalizedRecords,
            updatedAt: new Date().toISOString(),
          }));
        } else {
          const now = new Date().toISOString();
          const id = makeId("patient");
          setPatients([
            {
              ...normalizedProfile,
              id,
              records: normalizedRecords,
              createdAt: now,
              updatedAt: now,
            },
          ]);
          setActivePatientId(id);
        }
      },
    };
  }, [patients, activePatientId, activePatient, hydrated]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAllergy() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAllergy must be used inside AllergyProvider");
  return value;
}
