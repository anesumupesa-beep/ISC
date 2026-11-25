"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth/client";

async function signOut() {
  await authClient.signOut();
  // Offline page copies belong to this user; don't leave them on a shared phone.
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("isc-connect-")).map((k) => caches.delete(k)));
  }
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
