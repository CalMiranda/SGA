"use client";

import { createContext, useContext } from "react";

export type SGAUser = {
  id?: number;
  username: string;
  roles: string[];
  is_superuser?: boolean;
};

export type SGAAccess = { user: SGAUser | null; canWrite: boolean };

export const SGAAccessContext = createContext<SGAAccess>({ user: null, canWrite: false });

export function useSGAAccess() {
  return useContext(SGAAccessContext);
}
