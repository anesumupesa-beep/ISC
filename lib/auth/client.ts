"use client";
import { createAuthClient } from "@neondatabase/auth/next";

// Talks to the same-origin proxy at /api/auth. UI: authClient.useSession(), authClient.signOut().
export const authClient = createAuthClient();
