"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserProfile } from "@/utils/auth/types";

const UserContext = createContext<UserProfile | null>(null);

export function UserProvider({ profile, children }: { profile: UserProfile | null; children: ReactNode }) {
  return <UserContext.Provider value={profile}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
