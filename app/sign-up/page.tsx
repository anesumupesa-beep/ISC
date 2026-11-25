import type { Metadata } from "next";
import { AuthCard } from "@/lib/auth/auth-card";

export const metadata: Metadata = { title: "Create account · ISC Connect" };

export default function SignUpPage() {
  return (
    <main className="auth-page" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <AuthCard path="sign-up" />
    </main>
  );
}
