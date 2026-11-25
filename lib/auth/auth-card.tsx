"use client";
import "@neondatabase/auth/ui/css";
import { AuthView, NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "./client";

/** Prebuilt Neon Auth form; basePath "" makes its links point at /sign-in and /sign-up. */
export function AuthCard({ path }: { path: "sign-in" | "sign-up" }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      basePath=""
      redirectTo="/"
      credentials={{ forgotPassword: false }}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      defaultTheme="light"
    >
      <AuthView path={path} />
    </NeonAuthUIProvider>
  );
}
