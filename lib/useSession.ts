"use client";

import { useEffect, useState } from "react";

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent" | "approver" | "requester";
}

export function useSession() {
  const [user, setUser] = useState<ClientUser | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  return { user, loading: user === undefined };
}
