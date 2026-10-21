"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type LinkParentForm = {
  name: string;
  email: string;
  relationship: "Mamá" | "Papá" | "Tutor/a" | "";
};

export type ParentLink = {
  name: string;
  relationship: string;
  status: "active" | "pending";
  initial: string;
  avatarBackground: string;
};

type KidsContextValue = {
  addParent: (kidId: string, form: LinkParentForm) => void;
  getParents: (kidId: string) => ParentLink[];
};

const NO_PARENTS: ParentLink[] = [];
const KidsContext = createContext<KidsContextValue | null>(null);

export function KidsProvider({ children }: { children: ReactNode }) {
  const [parentsByKid, setParentsByKid] = useState<Record<string, ParentLink[]>>({});

  const addParent = useCallback((kidId: string, form: LinkParentForm) => {
    const name = form.name.trim();
    const parent: ParentLink = {
      name,
      relationship: form.relationship,
      status: "pending",
      initial: name.charAt(0).toUpperCase(),
      avatarBackground: "#A9C7E8",
    };

    setParentsByKid((current) => ({
      ...current,
      [kidId]: [...(current[kidId] ?? []), parent],
    }));
  }, []);

  const getParents = useCallback((kidId: string) => parentsByKid[kidId] ?? NO_PARENTS, [parentsByKid]);

  const value = useMemo(() => ({ addParent, getParents }), [addParent, getParents]);

  return <KidsContext.Provider value={value}>{children}</KidsContext.Provider>;
}

export function useKids() {
  const context = useContext(KidsContext);

  if (!context) {
    throw new Error("useKids must be used within KidsProvider");
  }

  return context;
}
