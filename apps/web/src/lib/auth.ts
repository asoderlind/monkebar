import { createAuthClient } from "better-auth/react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/auth`,
});

export const { signIn, signOut, useSession } = authClient;
