import { useEffect, useState } from "react";
import type { UserSummary } from "../../../entities/user/model/types";

function readStoredUser() {
  const raw = localStorage.getItem("aegis:user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSummary;
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const [token, setToken] = useState(() => localStorage.getItem("aegis:access-token") || "");
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("aegis:refresh-token") || "");
  const [user, setUser] = useState<UserSummary | null>(readStoredUser);

  useEffect(() => {
    if (token.trim()) localStorage.setItem("aegis:access-token", token.trim());
    else localStorage.removeItem("aegis:access-token");
  }, [token]);

  useEffect(() => {
    if (refreshToken.trim()) localStorage.setItem("aegis:refresh-token", refreshToken.trim());
    else localStorage.removeItem("aegis:refresh-token");
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem("aegis:user", JSON.stringify(user));
    else localStorage.removeItem("aegis:user");
  }, [user]);

  return {
    token,
    refreshToken,
    user,
    setToken,
    setRefreshToken,
    setUser,
  };
}
