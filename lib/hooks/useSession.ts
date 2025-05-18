'use client';

import { SessionContext } from "@/components/session-provider";
import { useContext } from "react";

export function useSession() {
  return useContext(SessionContext);
}