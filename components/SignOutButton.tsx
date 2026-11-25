"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth/client";

// INTEGRATOR: confirm this is the right Neon Auth sign-out call (and its redirect target).
async function signOut() {
  await authClient.signOut();
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.replace("/sign-in");
          router.refresh(); // drop cached signed-in RSC payloads
        })
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
